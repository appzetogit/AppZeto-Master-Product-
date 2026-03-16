import { z } from 'zod';
import { ValidationError } from '../../../../core/auth/errors.js';

const phoneSchema = z
    .string()
    .min(8, 'Phone must be at least 8 digits')
    .max(15, 'Phone must be at most 15 digits');

const emailSchema = z.string().email('Invalid email').optional().or(z.literal(''));

const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

const restaurantRegisterSchema = z.object({
    restaurantName: z.string().min(1, 'Restaurant name is required'),
    ownerName: z.string().min(1, 'Owner name is required'),
    ownerEmail: emailSchema,
    ownerPhone: phoneSchema.optional(),
    primaryContactNumber: phoneSchema.optional(),
    addressLine1: z.string().optional(),
    addressLine2: z.string().optional(),
    area: z.string().optional(),
    city: z.string().optional(),
    landmark: z.string().optional(),
    cuisines: z
        .string()
        .optional()
        .transform((val) => (val ? val.split(',').map((c) => c.trim()).filter(Boolean) : [])),
    openingTime: z.string().optional(),
    closingTime: z.string().optional(),
    openDays: z
        .string()
        .optional()
        .transform((val) => (val ? val.split(',').map((d) => d.trim()).filter(Boolean) : [])),
    panNumber: z
        .string()
        .regex(panRegex, 'Invalid PAN format')
        .optional()
        .or(z.literal('')),
    nameOnPan: z.string().optional(),
    gstRegistered: z
        .string()
        .optional()
        .transform((val) => val === 'true' || val === '1'),
    gstNumber: z.string().optional(),
    gstLegalName: z.string().optional(),
    gstAddress: z.string().optional(),
    fssaiNumber: z.string().optional(),
    fssaiExpiry: z.string().optional(),
    accountNumber: z.string().optional(),
    ifscCode: z.string().optional(),
    accountHolderName: z.string().optional(),
    accountType: z.string().optional()
});

export const validateRestaurantRegisterDto = (body) => {
    const result = restaurantRegisterSchema.safeParse(body);
    if (!result.success) {
        throw new ValidationError(result.error.errors[0].message);
    }

    const data = result.data;
    return {
        ...data,
        gstRegistered: data.gstRegistered ?? false
    };
};

