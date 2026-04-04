import ms from "ms";
import mongoose from "mongoose";
import { createOrUpdateOtp, verifyOtp } from "../../../../core/otp/otp.service.js";
import { signAccessToken, signRefreshToken } from "../../../../core/auth/token.util.js";
import { FoodRefreshToken } from "../../../../core/refreshTokens/refreshToken.model.js";
import { config } from "../../../../config/env.js";
import { uploadImageBuffer } from "../../../../services/cloudinary.service.js";
import { sendError, sendResponse } from "../../../../utils/response.js";
import { Seller } from "../models/seller.model.js";
import { SellerNotification } from "../models/sellerNotification.model.js";
import { SellerOrder } from "../models/sellerOrder.model.js";
import { SellerProduct } from "../models/sellerProduct.model.js";
import { SellerReturn } from "../models/sellerReturn.model.js";
import { SellerStockAdjustment } from "../models/sellerStockAdjustment.model.js";
import { SellerTransaction } from "../models/sellerTransaction.model.js";
import {
  buildSellerCategoryTree,
  ensureSellerCategoriesSeeded,
  resolveSellerCategoryIds,
  syncSellerInventoryNotification,
} from "../services/sellerCatalog.service.js";

const STATUS_LABELS = {
  pending: "Pending",
  confirmed: "Confirmed",
  packed: "Packed",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const normalizePhone = (value) => String(value || "").replace(/\D/g, "");
const last10 = (value) => normalizePhone(value).slice(-10);
const num = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const optionalNumber = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};
const optionalDate = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};
const optionalBoolean = (value, fallback = false) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes"].includes(normalized)) return true;
    if (["false", "0", "no"].includes(normalized)) return false;
  }
  return fallback;
};
const str = (value, fallback = "") =>
  typeof value === "string" ? value.trim() : fallback;
const arr = (value) => (Array.isArray(value) ? value : []);
const currency = (value) => `₹${num(value, 0).toLocaleString("en-IN")}`;
const slugify = (value) =>
  String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "item";

const createSellerSku = () =>
  `SKU-${Date.now().toString(36).slice(-6).toUpperCase()}`;

const serializeSellerProfile = (seller) => ({
  _id: seller._id,
  name: seller.name,
  shopName: seller.shopName,
  phone: seller.phoneLast10 || seller.phone || "",
  email: seller.email || "",
  role: "Seller",
  isActive: seller.isActive !== false,
  isVerified: seller.isVerified !== false,
  approved: seller.approved !== false,
  approvalStatus:
    seller.approvalStatus ||
    (seller.approved === false ? "pending" : "approved"),
  onboardingSubmitted: seller.onboardingSubmitted === true,
  approvalNotes: seller.approvalNotes || "",
  approvedAt: seller.approvedAt || null,
  rejectedAt: seller.rejectedAt || null,
  location: seller.location || null,
  serviceRadius: num(seller.serviceRadius, 5),
  address: seller.location?.formattedAddress || seller.location?.address || "",
  bankInfo: {
    bankName: seller.bankInfo?.bankName || "",
    accountHolderName: seller.bankInfo?.accountHolderName || "",
    accountNumber: seller.bankInfo?.accountNumber || "",
    ifscCode: seller.bankInfo?.ifscCode || "",
    accountType: seller.bankInfo?.accountType || "",
    upiId: seller.bankInfo?.upiId || "",
    upiQrImage: seller.bankInfo?.upiQrImage || "",
  },
  documents: {
    panNumber: seller.documents?.panNumber || "",
    gstRegistered: seller.documents?.gstRegistered === true,
    gstNumber: seller.documents?.gstNumber || "",
    gstLegalName: seller.documents?.gstLegalName || "",
    fssaiNumber: seller.documents?.fssaiNumber || "",
    fssaiExpiry: seller.documents?.fssaiExpiry || null,
    shopLicenseNumber: seller.documents?.shopLicenseNumber || "",
    shopLicenseImage: seller.documents?.shopLicenseImage || "",
    shopLicenseExpiry: seller.documents?.shopLicenseExpiry || null,
    isDocumentsVerified: seller.documents?.isDocumentsVerified === true,
  },
  shopInfo: {
    businessType: seller.shopInfo?.businessType || "",
    alternatePhone: seller.shopInfo?.alternatePhone || "",
    supportEmail: seller.shopInfo?.supportEmail || "",
    openingHours: seller.shopInfo?.openingHours || "",
    zoneId: seller.shopInfo?.zoneId || null,
    zoneSource: seller.shopInfo?.zoneSource || "",
    zoneName: seller.shopInfo?.zoneName || "",
  },
});

const objectIdOrNull = (value) =>
  mongoose.Types.ObjectId.isValid(value)
    ? new mongoose.Types.ObjectId(value)
    : null;

const toDataUrl = (file) =>
  file
    ? `data:${file.mimetype};base64,${file.buffer.toString("base64")}`
    : "";

const parseTags = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || "").trim())
      .filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

const parseVariants = (raw, fallback = {}) => {
  let parsed = raw;
  if (typeof raw === "string" && raw.trim()) {
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = [];
    }
  }

  const variants = arr(parsed)
    .map((variant, index) => ({
      name: str(variant?.name) || `Variant ${index + 1}`,
      price: num(variant?.price, fallback.price),
      salePrice: num(variant?.salePrice, fallback.salePrice),
      stock: Math.max(0, num(variant?.stock, fallback.stock)),
      sku: str(variant?.sku) || fallback.sku || createSellerSku(),
    }))
    .filter((variant) => variant.name);

  if (variants.length > 0) {
    return variants;
  }

  return [
    {
      name: str(fallback.weight) || "Default",
      price: num(fallback.price),
      salePrice: num(fallback.salePrice),
      stock: Math.max(0, num(fallback.stock)),
      sku: str(fallback.sku) || createSellerSku(),
    },
  ];
};

const populateProductQuery = (query) =>
  query
    .populate("headerId", "name")
    .populate("categoryId", "name")
    .populate("subcategoryId", "name");

const serializeProduct = (product) => {
  if (!product) return null;
  const doc =
    typeof product.toObject === "function"
      ? product.toObject({ virtuals: true })
      : { ...product };
  return {
    ...doc,
    id: doc._id,
  };
};

const sellerScope = (req) => req.user?.userId;

const parseProductPayload = (req, existingProduct = null) => {
  const mainUpload = arr(req.files?.mainImage)[0];
  const galleryUploads = arr(req.files?.galleryImages);
  const variants = parseVariants(req.body?.variants, {
    price: req.body?.price,
    salePrice: req.body?.salePrice,
    stock: req.body?.stock,
    sku: req.body?.sku,
    weight: req.body?.weight,
  });
  const firstVariant = variants[0] || {};

  return {
    name: str(req.body?.name) || existingProduct?.name || "Untitled Product",
    slug:
      slugify(str(req.body?.slug) || str(req.body?.name) || existingProduct?.slug) ||
      slugify(existingProduct?.name),
    sku: str(req.body?.sku) || existingProduct?.sku || firstVariant?.sku || createSellerSku(),
    description: str(req.body?.description) || existingProduct?.description || "",
    price: num(req.body?.price, firstVariant?.price ?? existingProduct?.price ?? 0),
    salePrice: num(
      req.body?.salePrice,
      firstVariant?.salePrice ?? existingProduct?.salePrice ?? 0,
    ),
    stock: Math.max(
      0,
      num(req.body?.stock, firstVariant?.stock ?? existingProduct?.stock ?? 0),
    ),
    lowStockAlert: Math.max(
      0,
      num(req.body?.lowStockAlert, existingProduct?.lowStockAlert ?? 5),
    ),
    brand: str(req.body?.brand) || existingProduct?.brand || "",
    weight: str(req.body?.weight) || existingProduct?.weight || "",
    tags: parseTags(req.body?.tags ?? existingProduct?.tags),
    mainImage:
      toDataUrl(mainUpload) ||
      str(req.body?.mainImage) ||
      existingProduct?.mainImage ||
      "",
    image:
      toDataUrl(mainUpload) ||
      str(req.body?.mainImage) ||
      existingProduct?.mainImage ||
      existingProduct?.image ||
      "",
    galleryImages:
      galleryUploads.length > 0
        ? galleryUploads.map(toDataUrl).filter(Boolean)
        : arr(existingProduct?.galleryImages),
    mrp: num(
      req.body?.mrp,
      req.body?.salePrice ?? req.body?.price ?? existingProduct?.mrp ?? firstVariant?.salePrice ?? firstVariant?.price ?? 0,
    ),
    unit: str(req.body?.unit) || str(req.body?.weight) || existingProduct?.unit || "",
    status:
      str(req.body?.status).toLowerCase() === "inactive"
        ? "inactive"
        : "active",
    isActive: str(req.body?.status).toLowerCase() === "inactive" ? false : true,
    approvalStatus: existingProduct?.approvalStatus || "pending",
    approvedAt:
      (existingProduct?.approvalStatus || "pending") === "approved"
        ? existingProduct?.approvedAt || new Date()
        : null,
    variants,
  };
};

const createAuthTokens = async (sellerId) => {
  const payload = { userId: String(sellerId), role: "SELLER" };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);
  const ttlMs = ms(config.jwtRefreshExpiresIn || "7d");
  const expiresAt = new Date(Date.now() + ttlMs);

  await FoodRefreshToken.create({
    userId: sellerId,
    token: refreshToken,
    expiresAt,
  });

  return { accessToken, refreshToken };
};

const availableWithdrawalBalance = (transactions) => {
  const totalRevenue = transactions
    .filter((item) => item.type === "Order Payment")
    .reduce((sum, item) => sum + num(item.amount), 0);
  const totalWithdrawn = transactions
    .filter(
      (item) => item.type === "Withdrawal" && item.status === "Settled",
    )
    .reduce((sum, item) => sum + Math.abs(num(item.amount)), 0);
  const pendingPayouts = transactions
    .filter(
      (item) =>
        item.type === "Withdrawal" &&
        ["Pending", "Processing"].includes(String(item.status || "")),
    )
    .reduce((sum, item) => sum + Math.abs(num(item.amount)), 0);

  return Math.max(0, totalRevenue - totalWithdrawn - pendingPayouts);
};

const monthlyRevenueChart = (transactions) => {
  const buckets = new Map();
  const now = new Date();

  for (let offset = 5; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    buckets.set(`${date.getFullYear()}-${date.getMonth()}`, {
      name: date.toLocaleDateString("en-IN", { month: "short" }),
      revenue: 0,
    });
  }

  transactions
    .filter((item) => item.type === "Order Payment")
    .forEach((item) => {
      const createdAt = item.createdAt ? new Date(item.createdAt) : null;
      if (!createdAt || Number.isNaN(createdAt.getTime())) return;
      const bucket = buckets.get(
        `${createdAt.getFullYear()}-${createdAt.getMonth()}`,
      );
      if (bucket) {
        bucket.revenue += num(item.amount);
      }
    });

  return Array.from(buckets.values());
};

const serializeLedger = (transactions) =>
  transactions.map((item) => ({
    id: item.reference || String(item._id),
    type: item.type,
    amount: item.amount,
    status: item.status,
    date: item.createdAt
      ? new Date(item.createdAt).toLocaleDateString("en-IN")
      : "",
    time: item.createdAt
      ? new Date(item.createdAt).toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "",
    customer:
      item.type === "Withdrawal"
        ? item.customer || "Bank Transfer"
        : item.customer || "Customer",
    ref: item.orderId || item.reference || String(item._id),
    reason: item.reason || "",
    createdAt: item.createdAt,
  }));

export const requestSellerOtpController = async (req, res) => {
  try {
    const phone = str(req.body?.phone);
    const digits = normalizePhone(phone);
    if (digits.length < 10) {
      return sendError(res, 400, "Enter a valid phone number");
    }

    const otp = await createOrUpdateOtp(phone);
    const hasSmsProvider = Boolean(config.smsApiKey && config.smsSenderId);
    const isLocalRequest = ["localhost", "127.0.0.1", "::1"].includes(
      String(req.hostname || "").toLowerCase(),
    );
    const shouldExposeOtp =
      config.nodeEnv !== "production" ||
      config.useDefaultOtp ||
      (!hasSmsProvider && isLocalRequest);

    return sendResponse(res, 200, "OTP sent successfully", {
      phone,
      deliveryMode:
        shouldExposeOtp && !hasSmsProvider ? "debug" : "sms",
      ...(shouldExposeOtp ? { otp } : {}),
    });
  } catch (error) {
    return sendError(res, 400, error.message || "Failed to send OTP");
  }
};

export const verifySellerOtpController = async (req, res) => {
  try {
    const phone = str(req.body?.phone);
    const otp = str(req.body?.otp);

    if (!phone || !otp) {
      return sendError(res, 400, "Phone and OTP are required");
    }

    const verification = await verifyOtp(phone, otp);
    if (!verification.valid) {
      return sendError(res, 401, verification.reason || "OTP verification failed");
    }

    const digits = normalizePhone(phone);
    const phoneSuffix = digits.slice(-10);
    let seller = await Seller.findOne({
      $or: [
        { phone },
        { phoneDigits: digits },
        ...(phoneSuffix ? [{ phoneLast10: phoneSuffix }] : []),
      ],
    });

    if (!seller) {
      const suffix = phoneSuffix || digits || Date.now().toString().slice(-4);
      seller = await Seller.create({
        name: `Seller ${suffix.slice(-4)}`,
        shopName: `Store ${suffix.slice(-4)}`,
        phone,
        email: `seller${suffix}@seller.local`,
        isVerified: true,
        isActive: true,
        approved: false,
        approvalStatus: "draft",
        onboardingSubmitted: false,
        approvedAt: null,
        rejectedAt: null,
        lastLogin: new Date(),
      });
    } else {
      seller.isVerified = true;
      seller.lastLogin = new Date();
      await seller.save();
    }

    await ensureSellerCategoriesSeeded();
    const { accessToken, refreshToken } = await createAuthTokens(seller._id);

    return sendResponse(res, 200, "Seller login successful", {
      accessToken,
      refreshToken,
      seller: serializeSellerProfile(seller),
    });
  } catch (error) {
    return sendError(res, 400, error.message || "OTP verification failed");
  }
};

export const getSellerCategoryTreeController = async (_req, res) => {
  try {
    const tree = await buildSellerCategoryTree();
    return res.json({ success: true, result: tree });
  } catch (error) {
    return sendError(res, 500, error.message || "Failed to load categories");
  }
};

export const getSellerProductsController = async (req, res) => {
  try {
    const sellerId = sellerScope(req);
    const page = Math.max(1, num(req.query?.page, 1));
    const limit = Math.max(1, Math.min(100, num(req.query?.limit, 20)));
    const skip = (page - 1) * limit;
    const stockStatus = str(req.query?.stockStatus).toLowerCase();

    const query = { sellerId };
    if (stockStatus === "in") query.stock = { $gt: 0 };
    if (stockStatus === "out") query.stock = 0;

    const [items, total] = await Promise.all([
      populateProductQuery(
        SellerProduct.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      ).lean(),
      SellerProduct.countDocuments(query),
    ]);

    return res.json({
      success: true,
      result: {
        items: items.map(serializeProduct),
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    return sendError(res, 500, error.message || "Failed to load products");
  }
};

export const getSellerProductByIdController = async (req, res) => {
  try {
    const sellerId = sellerScope(req);
    const { productId } = req.params;

    const product = await populateProductQuery(
      SellerProduct.findOne({ _id: productId, sellerId }),
    );

    if (!product) {
      return sendError(res, 404, "Product not found");
    }

    return res.json({ success: true, result: serializeProduct(product) });
  } catch (error) {
    return sendError(res, 500, error.message || "Failed to load product");
  }
};

export const createSellerProductController = async (req, res) => {
  try {
    const sellerId = sellerScope(req);
    const basePayload = parseProductPayload(req);
    const categoryIds = await resolveSellerCategoryIds({
      headerId: req.body?.headerId,
      categoryId: req.body?.categoryId,
      subcategoryId: req.body?.subcategoryId,
    });

    const product = await SellerProduct.create({
      sellerId,
      ...basePayload,
      ...categoryIds,
    });

    await syncSellerInventoryNotification(sellerId, product);

    const populated = await populateProductQuery(
      SellerProduct.findById(product._id),
    ).lean();

    return res.status(201).json({ success: true, result: serializeProduct(populated) });
  } catch (error) {
    if (error?.code === 11000) {
      return sendError(res, 400, "Product slug or SKU already exists");
    }
    return sendError(res, 500, error.message || "Failed to create product");
  }
};

export const updateSellerProductController = async (req, res) => {
  try {
    const sellerId = sellerScope(req);
    const { productId } = req.params;
    const existing = await SellerProduct.findOne({ _id: productId, sellerId });
    if (!existing) {
      return sendError(res, 404, "Product not found");
    }

    const categoryIds = await resolveSellerCategoryIds({
      headerId: req.body?.headerId || existing.headerId,
      categoryId: req.body?.categoryId || existing.categoryId,
      subcategoryId: req.body?.subcategoryId || existing.subcategoryId,
    });

    const payload = parseProductPayload(req, existing);

    Object.assign(existing, {
      ...payload,
      ...categoryIds,
    });

    await existing.save();
    await syncSellerInventoryNotification(sellerId, existing);

    const populated = await populateProductQuery(
      SellerProduct.findById(existing._id),
    ).lean();

    return res.json({ success: true, result: serializeProduct(populated) });
  } catch (error) {
    if (error?.code === 11000) {
      return sendError(res, 400, "Product slug or SKU already exists");
    }
    return sendError(res, 500, error.message || "Failed to update product");
  }
};

export const deleteSellerProductController = async (req, res) => {
  try {
    const sellerId = sellerScope(req);
    const { productId } = req.params;
    const deleted = await SellerProduct.findOneAndDelete({ _id: productId, sellerId });

    if (!deleted) {
      return sendError(res, 404, "Product not found");
    }

    await SellerNotification.deleteMany({
      sellerId,
      key: {
        $in: [
          `inventory:${deleted._id}:low`,
          `inventory:${deleted._id}:out`,
        ],
      },
    });

    return res.json({ success: true, result: { deleted: true } });
  } catch (error) {
    return sendError(res, 500, error.message || "Failed to delete product");
  }
};

export const getSellerStockHistoryController = async (req, res) => {
  try {
    const sellerId = sellerScope(req);
    const history = await SellerStockAdjustment.find({ sellerId })
      .populate("productId", "name")
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    return res.json({
      success: true,
      result: history.map((item) => ({
        ...item,
        product: item.productId
          ? {
              _id: item.productId._id,
              name: item.productId.name,
            }
          : null,
      })),
    });
  } catch (error) {
    return sendError(res, 500, error.message || "Failed to load stock history");
  }
};

export const adjustSellerStockController = async (req, res) => {
  try {
    const sellerId = sellerScope(req);
    const productId = str(req.body?.productId);
    const quantity = num(req.body?.quantity);
    const type = str(req.body?.type) || "Correction";

    const product = await SellerProduct.findOne({ _id: productId, sellerId });
    if (!product) {
      return sendError(res, 404, "Product not found");
    }

    const nextStock = Math.max(0, num(product.stock) + quantity);
    product.stock = nextStock;
    product.status = nextStock === 0 ? "inactive" : "active";
    product.isActive = nextStock > 0;
    if (Array.isArray(product.variants) && product.variants.length > 0) {
      product.variants[0].stock = nextStock;
    }
    await product.save();

    await SellerStockAdjustment.create({
      sellerId,
      productId: product._id,
      type,
      quantity,
      note: str(req.body?.note),
    });

    await syncSellerInventoryNotification(sellerId, product);

    return res.json({ success: true, result: serializeProduct(product) });
  } catch (error) {
    return sendError(res, 500, error.message || "Failed to adjust stock");
  }
};

export const getSellerProfileController = async (req, res) => {
  try {
    const seller = await Seller.findById(sellerScope(req)).lean();
    if (!seller) {
      return sendError(res, 404, "Seller not found");
    }

    return res.json({
      success: true,
      result: serializeSellerProfile(seller),
    });
  } catch (error) {
    return sendError(res, 500, error.message || "Failed to load seller profile");
  }
};

export const updateSellerProfileController = async (req, res) => {
  try {
    const seller = await Seller.findById(sellerScope(req));
    if (!seller) {
      return sendError(res, 404, "Seller not found");
    }

    if (req.body?.name !== undefined) seller.name = str(req.body.name) || seller.name;
    if (req.body?.shopName !== undefined) seller.shopName = str(req.body.shopName) || seller.shopName;
    if (req.body?.phone !== undefined) seller.phone = str(req.body.phone) || seller.phone;
    if (req.body?.email !== undefined) seller.email = str(req.body.email).toLowerCase();

    const lat = optionalNumber(req.body?.lat);
    const lng = optionalNumber(req.body?.lng);
    const address = str(req.body?.address);
    const radius = num(req.body?.radius, seller.serviceRadius ?? 5);
    const bankInfoBody =
      req.body?.bankInfo && typeof req.body.bankInfo === "object"
        ? req.body.bankInfo
        : {};
    const documentsBody =
      req.body?.documents && typeof req.body.documents === "object"
        ? req.body.documents
        : {};
    const shopInfoBody =
      req.body?.shopInfo && typeof req.body.shopInfo === "object"
        ? req.body.shopInfo
        : {};
    const files = req.files && typeof req.files === "object" ? req.files : {};
    const submitForApproval = optionalBoolean(
      req.body?.submitForApproval,
      false,
    );

    seller.serviceRadius = Math.max(1, Math.min(100, radius || 5));

    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      seller.location = {
        type: "Point",
        coordinates: [lng, lat],
        latitude: lat,
        longitude: lng,
        formattedAddress: address,
        address,
      };
    } else if (address && seller.location) {
      seller.location.formattedAddress = address;
      seller.location.address = address;
    } else if (address) {
      seller.location = {
        type: "Point",
        formattedAddress: address,
        address,
      };
    }

    seller.bankInfo = seller.bankInfo || {};
    if (req.body?.bankName !== undefined || bankInfoBody.bankName !== undefined) {
      seller.bankInfo.bankName = str(
        bankInfoBody.bankName ?? req.body.bankName,
        "",
      );
    }
    if (
      req.body?.accountHolderName !== undefined ||
      bankInfoBody.accountHolderName !== undefined
    ) {
      seller.bankInfo.accountHolderName = str(
        bankInfoBody.accountHolderName ?? req.body.accountHolderName,
        "",
      );
    }
    if (
      req.body?.accountNumber !== undefined ||
      bankInfoBody.accountNumber !== undefined
    ) {
      seller.bankInfo.accountNumber = str(
        bankInfoBody.accountNumber ?? req.body.accountNumber,
        "",
      );
    }
    if (req.body?.ifscCode !== undefined || bankInfoBody.ifscCode !== undefined) {
      seller.bankInfo.ifscCode = str(
        bankInfoBody.ifscCode ?? req.body.ifscCode,
        "",
      );
    }
    if (
      req.body?.accountType !== undefined ||
      bankInfoBody.accountType !== undefined
    ) {
      seller.bankInfo.accountType = str(
        bankInfoBody.accountType ?? req.body.accountType,
        "",
      );
    }
    if (req.body?.upiId !== undefined || bankInfoBody.upiId !== undefined) {
      seller.bankInfo.upiId = str(bankInfoBody.upiId ?? req.body.upiId, "");
    }
    if (
      req.body?.upiQrImage !== undefined ||
      req.body?.upiQrCode !== undefined ||
      bankInfoBody.upiQrImage !== undefined
    ) {
      seller.bankInfo.upiQrImage = str(
        bankInfoBody.upiQrImage ?? req.body.upiQrImage ?? req.body.upiQrCode,
        "",
      );
    }
    if (files?.upiQrImage?.[0]) {
      seller.bankInfo.upiQrImage = await uploadImageBuffer(
        files.upiQrImage[0].buffer,
        "seller/upi-qr",
      );
    }

    seller.documents = seller.documents || {};
    if (req.body?.panNumber !== undefined || documentsBody.panNumber !== undefined) {
      seller.documents.panNumber = str(
        documentsBody.panNumber ?? req.body.panNumber,
        "",
      );
    }
    if (
      req.body?.gstRegistered !== undefined ||
      documentsBody.gstRegistered !== undefined
    ) {
      seller.documents.gstRegistered = optionalBoolean(
        documentsBody.gstRegistered ?? req.body.gstRegistered,
        seller.documents.gstRegistered === true,
      );
    }
    if (req.body?.gstNumber !== undefined || documentsBody.gstNumber !== undefined) {
      seller.documents.gstNumber = str(
        documentsBody.gstNumber ?? req.body.gstNumber,
        "",
      );
    }
    if (
      req.body?.gstLegalName !== undefined ||
      documentsBody.gstLegalName !== undefined
    ) {
      seller.documents.gstLegalName = str(
        documentsBody.gstLegalName ?? req.body.gstLegalName,
        "",
      );
    }
    if (
      req.body?.fssaiNumber !== undefined ||
      documentsBody.fssaiNumber !== undefined
    ) {
      seller.documents.fssaiNumber = str(
        documentsBody.fssaiNumber ?? req.body.fssaiNumber,
        "",
      );
    }
    if (
      req.body?.fssaiExpiry !== undefined ||
      documentsBody.fssaiExpiry !== undefined
    ) {
      seller.documents.fssaiExpiry = optionalDate(
        documentsBody.fssaiExpiry ?? req.body.fssaiExpiry,
      );
    }
    if (
      req.body?.shopLicenseNumber !== undefined ||
      documentsBody.shopLicenseNumber !== undefined
    ) {
      seller.documents.shopLicenseNumber = str(
        documentsBody.shopLicenseNumber ?? req.body.shopLicenseNumber,
        "",
      );
    }
    if (
      req.body?.shopLicenseImage !== undefined ||
      documentsBody.shopLicenseImage !== undefined
    ) {
      seller.documents.shopLicenseImage = str(
        documentsBody.shopLicenseImage ?? req.body.shopLicenseImage,
        "",
      );
    }
    if (files?.shopLicenseImage?.[0]) {
      seller.documents.shopLicenseImage = await uploadImageBuffer(
        files.shopLicenseImage[0].buffer,
        "seller/shop-license",
      );
    }
    if (
      req.body?.shopLicenseExpiry !== undefined ||
      documentsBody.shopLicenseExpiry !== undefined
    ) {
      seller.documents.shopLicenseExpiry = optionalDate(
        documentsBody.shopLicenseExpiry ?? req.body.shopLicenseExpiry,
      );
    }
    if (
      req.body?.isDocumentsVerified !== undefined ||
      documentsBody.isDocumentsVerified !== undefined
    ) {
      seller.documents.isDocumentsVerified = optionalBoolean(
        documentsBody.isDocumentsVerified ?? req.body.isDocumentsVerified,
        seller.documents.isDocumentsVerified === true,
      );
    }

    seller.shopInfo = seller.shopInfo || {};
    if (
      req.body?.businessType !== undefined ||
      shopInfoBody.businessType !== undefined
    ) {
      seller.shopInfo.businessType = str(
        shopInfoBody.businessType ?? req.body.businessType,
        "",
      );
    }
    if (
      req.body?.alternatePhone !== undefined ||
      shopInfoBody.alternatePhone !== undefined
    ) {
      seller.shopInfo.alternatePhone = str(
        shopInfoBody.alternatePhone ?? req.body.alternatePhone,
        "",
      );
    }
    if (
      req.body?.supportEmail !== undefined ||
      shopInfoBody.supportEmail !== undefined
    ) {
      seller.shopInfo.supportEmail = str(
        shopInfoBody.supportEmail ?? req.body.supportEmail,
        "",
      );
    }
    if (
      req.body?.openingHours !== undefined ||
      shopInfoBody.openingHours !== undefined
    ) {
      seller.shopInfo.openingHours = str(
        shopInfoBody.openingHours ?? req.body.openingHours,
        "",
      );
    }
    if (req.body?.zoneId !== undefined || shopInfoBody.zoneId !== undefined) {
      seller.shopInfo.zoneId = objectIdOrNull(
        shopInfoBody.zoneId ?? req.body.zoneId,
      );
    }
    if (
      req.body?.zoneSource !== undefined ||
      shopInfoBody.zoneSource !== undefined
    ) {
      const zoneSource = str(
        shopInfoBody.zoneSource ?? req.body.zoneSource,
        "",
      ).toLowerCase();
      seller.shopInfo.zoneSource =
        zoneSource === "quick" ? "quick" : zoneSource === "food" ? "food" : "";
    }
    if (req.body?.zoneName !== undefined || shopInfoBody.zoneName !== undefined) {
      seller.shopInfo.zoneName = str(
        shopInfoBody.zoneName ?? req.body.zoneName,
        "",
      );
    }

    if (submitForApproval) {
      seller.onboardingSubmitted = true;
      seller.approved = false;
      seller.approvalStatus = "pending";
      seller.approvalNotes = "";
      seller.approvedAt = null;
      seller.rejectedAt = null;
    }

    await seller.save();

    return res.json({
      success: true,
      result: serializeSellerProfile(seller),
    });
  } catch (error) {
    if (error?.code === 11000) {
      return sendError(res, 400, "Phone or email already belongs to another seller");
    }
    return sendError(res, 500, error.message || "Failed to update seller profile");
  }
};

export const getSellerNotificationsController = async (req, res) => {
  try {
    const sellerId = sellerScope(req);
    const notifications = await SellerNotification.find({ sellerId })
      .sort({ createdAt: -1 })
      .limit(25)
      .lean();

    return res.json({
      success: true,
      result: {
        notifications,
        items: notifications,
        unreadCount: notifications.filter((item) => !item.isRead).length,
      },
    });
  } catch (error) {
    return sendError(res, 500, error.message || "Failed to load notifications");
  }
};

export const markSellerNotificationReadController = async (req, res) => {
  try {
    const sellerId = sellerScope(req);
    const updated = await SellerNotification.findOneAndUpdate(
      { _id: req.params.notificationId, sellerId },
      { $set: { isRead: true } },
      { new: true },
    ).lean();

    if (!updated) {
      return sendError(res, 404, "Notification not found");
    }

    return res.json({ success: true, result: updated });
  } catch (error) {
    return sendError(res, 500, error.message || "Failed to update notification");
  }
};

export const markAllSellerNotificationsReadController = async (req, res) => {
  try {
    await SellerNotification.updateMany(
      { sellerId: sellerScope(req), isRead: false },
      { $set: { isRead: true } },
    );

    return res.json({ success: true, result: { success: true } });
  } catch (error) {
    return sendError(res, 500, error.message || "Failed to update notifications");
  }
};

export const getSellerOrdersController = async (req, res) => {
  try {
    const sellerId = sellerScope(req);
    const page = Math.max(1, num(req.query?.page, 1));
    const limit = Math.max(1, Math.min(100, num(req.query?.limit, 50)));
    const skip = (page - 1) * limit;
    const query = { sellerId };

    if (req.query?.startDate || req.query?.endDate) {
      query.createdAt = {};
      if (req.query?.startDate) {
        query.createdAt.$gte = new Date(`${req.query.startDate}T00:00:00.000Z`);
      }
      if (req.query?.endDate) {
        query.createdAt.$lte = new Date(`${req.query.endDate}T23:59:59.999Z`);
      }
    }

    const [items, total] = await Promise.all([
      SellerOrder.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      SellerOrder.countDocuments(query),
    ]);

    return res.json({
      success: true,
      result: {
        items,
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    return sendError(res, 500, error.message || "Failed to load orders");
  }
};

export const updateSellerOrderStatusController = async (req, res) => {
  try {
    const sellerId = sellerScope(req);
    const nextStatus = str(req.body?.status || req.body?.orderStatus).toLowerCase();
    if (!nextStatus || !STATUS_LABELS[nextStatus]) {
      return sendError(res, 400, "Invalid order status");
    }

    const objectId = objectIdOrNull(req.params.orderId);
    const criteria = {
      sellerId,
      $or: [
        { orderId: req.params.orderId },
        ...(objectId ? [{ _id: objectId }] : []),
      ],
    };

    const order = await SellerOrder.findOne(criteria);
    if (!order) {
      return sendError(res, 404, "Order not found");
    }

    order.status = nextStatus;
    order.workflowStatus =
      nextStatus === "pending"
        ? "SELLER_PENDING"
        : nextStatus === "confirmed"
          ? "SELLER_CONFIRMED"
          : nextStatus.toUpperCase();
    await order.save();

    return res.json({ success: true, result: order.toObject() });
  } catch (error) {
    return sendError(res, 500, error.message || "Failed to update order status");
  }
};

export const getSellerReturnsController = async (req, res) => {
  try {
    const items = await SellerReturn.find({ sellerId: sellerScope(req) })
      .sort({ returnRequestedAt: -1 })
      .lean();

    return res.json({ success: true, result: { items } });
  } catch (error) {
    return sendError(res, 500, error.message || "Failed to load returns");
  }
};

export const approveSellerReturnController = async (req, res) => {
  try {
    const updated = await SellerReturn.findOneAndUpdate(
      { sellerId: sellerScope(req), orderId: req.params.orderId },
      { $set: { returnStatus: "return_approved", returnRejectedReason: "" } },
      { new: true },
    ).lean();

    if (!updated) {
      return sendError(res, 404, "Return request not found");
    }

    return res.json({ success: true, result: updated });
  } catch (error) {
    return sendError(res, 500, error.message || "Failed to approve return");
  }
};

export const rejectSellerReturnController = async (req, res) => {
  try {
    const updated = await SellerReturn.findOneAndUpdate(
      { sellerId: sellerScope(req), orderId: req.params.orderId },
      {
        $set: {
          returnStatus: "return_rejected",
          returnRejectedReason: str(req.body?.reason),
        },
      },
      { new: true },
    ).lean();

    if (!updated) {
      return sendError(res, 404, "Return request not found");
    }

    return res.json({ success: true, result: updated });
  } catch (error) {
    return sendError(res, 500, error.message || "Failed to reject return");
  }
};

export const getSellerEarningsController = async (req, res) => {
  try {
    const sellerId = sellerScope(req);
    const transactions = await SellerTransaction.find({ sellerId })
      .sort({ createdAt: -1 })
      .lean();

    const totalRevenue = transactions
      .filter((item) => item.type === "Order Payment")
      .reduce((sum, item) => sum + num(item.amount), 0);
    const totalWithdrawn = transactions
      .filter(
        (item) => item.type === "Withdrawal" && item.status === "Settled",
      )
      .reduce((sum, item) => sum + Math.abs(num(item.amount)), 0);
    const pendingPayouts = transactions
      .filter(
        (item) =>
          item.type === "Withdrawal" &&
          ["Pending", "Processing"].includes(String(item.status || "")),
      )
      .reduce((sum, item) => sum + Math.abs(num(item.amount)), 0);

    const balances = {
      totalRevenue,
      totalWithdrawn,
      settledBalance: availableWithdrawalBalance(transactions),
      pendingPayouts,
    };

    return res.json({
      success: true,
      result: {
        balances,
        monthlyChart: monthlyRevenueChart(transactions),
        ledger: serializeLedger(transactions),
      },
    });
  } catch (error) {
    return sendError(res, 500, error.message || "Failed to load earnings");
  }
};

export const requestSellerWithdrawalController = async (req, res) => {
  try {
    const sellerId = sellerScope(req);
    const amount = Math.abs(num(req.body?.amount));
    if (!amount) {
      return sendError(res, 400, "Enter a valid withdrawal amount");
    }

    const transactions = await SellerTransaction.find({ sellerId }).lean();
    const available = availableWithdrawalBalance(transactions);
    if (amount > available) {
      return sendError(
        res,
        400,
        `Insufficient balance. Available: ${currency(available)}`,
      );
    }

    const created = await SellerTransaction.create({
      sellerId,
      type: "Withdrawal",
      amount: -amount,
      status: "Pending",
      reference: `WDR-${Date.now()}`,
      customer: "Bank Transfer",
    });

    return res.status(201).json({ success: true, result: created.toObject() });
  } catch (error) {
    return sendError(res, 500, error.message || "Failed to create withdrawal");
  }
};

export const getSellerStatsController = async (req, res) => {
  try {
    const sellerId = sellerScope(req);
    const range = str(req.query?.range, "daily").toLowerCase();
    const [orders, products, transactions] = await Promise.all([
      SellerOrder.find({ sellerId }).sort({ createdAt: -1 }).lean(),
      populateProductQuery(SellerProduct.find({ sellerId })).lean(),
      SellerTransaction.find({ sellerId }).sort({ createdAt: -1 }).lean(),
    ]);

    const totalSales = orders.reduce(
      (sum, order) => sum + num(order?.pricing?.total),
      0,
    );
    const totalOrders = orders.length;
    const avgOrderValue = totalOrders ? totalSales / totalOrders : 0;

    const chartBuckets = new Map();
    const now = new Date();
    if (range === "monthly") {
      for (let offset = 5; offset >= 0; offset -= 1) {
        const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
        chartBuckets.set(`${date.getFullYear()}-${date.getMonth()}`, {
          key: `${date.getFullYear()}-${date.getMonth()}`,
          name: date.toLocaleDateString("en-IN", { month: "short" }),
          sales: 0,
          traffic: 0,
        });
      }
    } else if (range === "weekly") {
      for (let offset = 3; offset >= 0; offset -= 1) {
        chartBuckets.set(`week-${offset}`, {
          key: `week-${offset}`,
          name: `W${4 - offset}`,
          sales: 0,
          traffic: 0,
        });
      }
    } else {
      for (let offset = 6; offset >= 0; offset -= 1) {
        const date = new Date(now);
        date.setDate(now.getDate() - offset);
        chartBuckets.set(
          `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`,
          {
            key: `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`,
            name: date.toLocaleDateString("en-IN", { weekday: "short" }),
            sales: 0,
            traffic: 0,
          },
        );
      }
    }

    orders.forEach((order) => {
      const createdAt = order.createdAt ? new Date(order.createdAt) : null;
      if (!createdAt || Number.isNaN(createdAt.getTime())) return;

      const key =
        range === "monthly"
          ? `${createdAt.getFullYear()}-${createdAt.getMonth()}`
          : range === "weekly"
            ? `week-${Math.min(
                3,
                Math.floor((now - createdAt) / (7 * 24 * 60 * 60 * 1000)),
              )}`
            : `${createdAt.getFullYear()}-${createdAt.getMonth()}-${createdAt.getDate()}`;

      const bucket = chartBuckets.get(key);
      if (!bucket) return;
      bucket.sales += num(order?.pricing?.total);
      bucket.traffic += 1;
    });

    const categoryMixMap = new Map();
    products.forEach((product) => {
      const label =
        product?.categoryId?.name ||
        product?.subcategoryId?.name ||
        "Catalog";
      categoryMixMap.set(label, (categoryMixMap.get(label) || 0) + 1);
    });

    const topProductsMap = new Map();
    orders.forEach((order) => {
      arr(order.items).forEach((item) => {
        const name = str(item.name, "Item");
        if (!topProductsMap.has(name)) {
          topProductsMap.set(name, { name, sales: 0, revenue: 0 });
        }
        const current = topProductsMap.get(name);
        current.sales += num(item.quantity, 1);
        current.revenue += num(item.price) * num(item.quantity, 1);
      });
    });

    const balances = {
      totalRevenue: transactions
        .filter((item) => item.type === "Order Payment")
        .reduce((sum, item) => sum + num(item.amount), 0),
    };

    return res.json({
      success: true,
      result: {
        overview: {
          totalSales: currency(totalSales),
          totalOrders: String(totalOrders),
          avgOrderValue: currency(avgOrderValue),
          conversionRate: `${Math.max(
            0,
            Math.min(
              99,
              Math.round(
                products.length ? (totalOrders / products.length) * 25 : 0,
              ),
            ),
          )}%`,
          salesTrend: "+0%",
          ordersTrend: "+0%",
        },
        salesTrend: Array.from(chartBuckets.values()),
        categoryMix: Array.from(categoryMixMap.entries()).map(
          ([subject, count]) => ({
            subject,
            A: count,
          }),
        ),
        topProducts: Array.from(topProductsMap.values())
          .sort((a, b) => b.sales - a.sales)
          .slice(0, 5)
          .map((item) => ({
            ...item,
            revenue: currency(item.revenue),
            trend: Math.max(0, Math.round(item.sales * 1.5)),
          })),
        trafficSources: [
          {
            name: "Direct",
            value: totalOrders ? Math.max(1, Math.round(totalOrders * 0.5)) : 0,
            color: "#0f172a",
          },
          {
            name: "Repeat",
            value: totalOrders ? Math.max(1, Math.round(totalOrders * 0.3)) : 0,
            color: "#16a34a",
          },
          {
            name: "Search",
            value: totalOrders ? Math.max(1, Math.round(totalOrders * 0.2)) : 0,
            color: "#2563eb",
          },
        ],
        insights: {
          topCity: orders[0]?.address?.city || "Local",
          peakTime: orders[0]?.createdAt
            ? `${String(new Date(orders[0].createdAt).getHours()).padStart(
                2,
                "0",
              )}:00`
            : "12:00",
          topDevice: balances.totalRevenue > 0 ? "Mobile" : "N/A",
        },
      },
    });
  } catch (error) {
    return sendError(res, 500, error.message || "Failed to load stats");
  }
};
