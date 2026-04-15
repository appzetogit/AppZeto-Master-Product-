import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Camera, CheckCircle2, FileText, ShieldCheck, AlertCircle } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  clearDriverRegistrationSession,
  completeDriverOnboarding,
  getDriverDocumentTemplates,
  getStoredDriverRegistrationSession,
  saveDriverDocuments,
  saveDriverRegistrationSession,
} from '../../services/registrationService';
import {
  flattenDriverDocumentFields,
  getDocumentPreviewUrl,
  normalizeDriverDocumentTemplates,
} from '../../utils/documentTemplates';

const unwrap = (response) => response?.data?.data || response?.data || response;

const normalizeDocument = (doc) => {
  if (!doc) {
    return null;
  }

  if (typeof doc === 'string') {
    return {
      previewUrl: doc,
      secureUrl: doc,
      uploaded: true,
    };
  }

  return {
    ...doc,
    previewUrl: getDocumentPreviewUrl(doc),
    uploaded: doc.uploaded ?? Boolean(getDocumentPreviewUrl(doc)),
  };
};

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });

const StepDocuments = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const session = {
    ...getStoredDriverRegistrationSession(),
    ...(location.state || {}),
  };

  const inputRefs = useRef({});
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [docs, setDocs] = useState(() =>
    Object.fromEntries(
      Object.entries(session.documents || {}).map(([key, value]) => [key, normalizeDocument(value)]),
    ),
  );
  const [uploading, setUploading] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadTemplates = async () => {
      setTemplatesLoading(true);

      try {
        const response = await getDriverDocumentTemplates();
        const results = response?.data?.data?.results || response?.data?.results || [];
        setTemplates(normalizeDriverDocumentTemplates(results));
      } catch {
        setTemplates(normalizeDriverDocumentTemplates([]));
      } finally {
        setTemplatesLoading(false);
      }
    };

    loadTemplates();
  }, []);

  const documentTemplates = useMemo(
    () => normalizeDriverDocumentTemplates(templates),
    [templates],
  );
  const uploadFields = useMemo(
    () => flattenDriverDocumentFields(documentTemplates),
    [documentTemplates],
  );

  const openPicker = (key) => {
    inputRefs.current[key]?.click();
  };

  const handleFileChange = async (key, event) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }

    const tempPreviewUrl = URL.createObjectURL(file);
    setUploading(key);
    setError('');

    setDocs((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] || {}),
        previewUrl: tempPreviewUrl,
        fileName: file.name,
        mimeType: file.type,
        uploaded: false,
        uploading: true,
      },
    }));

    try {
      const dataUrl = await fileToDataUrl(file);
      const response = await saveDriverDocuments({
        registrationId: session.registrationId,
        phone: session.phone,
        documents: {
          [key]: {
            dataUrl,
            fileName: file.name,
            mimeType: file.type,
          },
        },
      });
      const payload = unwrap(response);

      const uploadedDoc = payload?.documents?.[key] || payload?.session?.documents?.[key];
      const nextDoc = normalizeDocument(uploadedDoc) || {
        previewUrl: tempPreviewUrl,
        secureUrl: tempPreviewUrl,
        fileName: file.name,
        mimeType: file.type,
        uploaded: true,
      };

      setDocs((prev) => ({
        ...prev,
        [key]: nextDoc,
      }));

      const storedSession = getStoredDriverRegistrationSession();
      saveDriverRegistrationSession({
        ...storedSession,
        ...session,
        documents: {
          ...(storedSession.documents || {}),
          [key]: nextDoc,
        },
      });
    } catch (uploadError) {
      setError(uploadError?.message || 'Unable to upload document');
      setDocs((prev) => ({
        ...prev,
        [key]: normalizeDocument(session.documents?.[key]),
      }));
    } finally {
      setUploading(null);
      URL.revokeObjectURL(tempPreviewUrl);
    }
  };

  const isComplete =
    uploadFields.every((item) => !item.isRequired || Boolean(docs[item.key]?.uploaded)) &&
    !uploading &&
    !templatesLoading;

  const handleSubmit = async () => {
    if (!isComplete) {
      setError(uploading ? 'Please wait for the current upload to finish' : 'Please upload all required documents');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const submittedDocuments = Object.fromEntries(
        Object.entries(docs).filter(([, value]) => Boolean(value?.uploaded || value?.secureUrl)),
      );

      const completeResponse = await completeDriverOnboarding({
        registrationId: session.registrationId,
        phone: session.phone,
        documents: submittedDocuments,
      });
      const payload = unwrap(completeResponse);

      const token = payload?.token;
      if (token) {
        localStorage.setItem('token', token);
        localStorage.setItem('driverToken', token);
        const normalizedRole =
          String(session.role || 'driver').toLowerCase() === 'owner' ? 'owner' : 'driver';
        localStorage.setItem('role', normalizedRole);
      }

      saveDriverRegistrationSession({
        ...session,
        documents: docs,
        completedRegistration: payload || null,
      });
      clearDriverRegistrationSession();

      navigate('/taxi/driver/registration-status', {
        state: {
          ...session,
          documents: docs,
          completedRegistration: payload || null,
        },
      });
    } catch (submitError) {
      setError(submitError?.message || 'Unable to complete registration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans p-5 pt-8 select-none overflow-x-hidden pb-32">
      <header className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 bg-slate-50 rounded-lg flex items-center justify-center text-slate-900 active:scale-95 transition-transform"
        >
          <ArrowLeft size={18} strokeWidth={2.5} />
        </button>
      </header>

      <main className="space-y-6 max-w-sm mx-auto">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none uppercase">KYC Vault</h1>
          <p className="text-[11px] font-bold text-slate-400 opacity-80 uppercase tracking-widest leading-relaxed">
            Upload the required documents configured by admin
          </p>
        </div>

        {error ? <p className="text-[11px] font-bold text-rose-500">{error}</p> : null}

        <div className="space-y-5">
          {templatesLoading ? (
            <div className="bg-slate-50 rounded-3xl p-5 text-center text-[11px] font-bold text-slate-400">
              Loading document checklist...
            </div>
          ) : (
            documentTemplates.map((template) => (
              <div key={template.id} className="bg-slate-50 rounded-3xl p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <h3 className="text-[14px] font-black text-slate-900 uppercase tracking-tight">{template.name}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                      {template.is_required ? 'Required' : 'Optional'} • {template.fields.length > 1 ? 'Multiple uploads' : 'Single upload'}
                    </p>
                  </div>
                  <span className="rounded-full bg-white px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-slate-500">
                    {template.account_type || 'individual'}
                  </span>
                </div>

                <div className={`grid gap-3 ${template.fields.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  {template.fields.map((field) => {
                    const document = docs[field.key];

                    return (
                      <button
                        key={field.key}
                        type="button"
                        onClick={() => openPicker(field.key)}
                        className={`relative min-h-[120px] rounded-2xl border transition-all overflow-hidden ${
                          document?.previewUrl
                            ? 'border-emerald-100 bg-emerald-50'
                            : 'border-dashed border-slate-200 bg-white'
                        }`}
                      >
                        <input
                          ref={(element) => {
                            inputRefs.current[field.key] = element;
                          }}
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={(event) => handleFileChange(field.key, event)}
                        />

                        {uploading === field.key ? (
                          <div className="flex h-full min-h-[120px] items-center justify-center">
                            <div className="w-5 h-5 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
                          </div>
                        ) : document?.previewUrl ? (
                          <>
                            <img src={document.previewUrl} alt={field.label} className="absolute inset-0 h-full w-full object-cover" />
                            <div className="absolute inset-0 bg-black/20" />
                          </>
                        ) : (
                          <div className="flex min-h-[120px] flex-col items-center justify-center gap-2 px-4 text-center">
                            <div className="w-10 h-10 rounded-2xl bg-slate-50 text-slate-500 flex items-center justify-center">
                              <FileText size={18} />
                            </div>
                            <div>
                              <p className="text-[11px] font-black uppercase tracking-widest text-slate-700">{field.label}</p>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                Tap to upload
                              </p>
                            </div>
                          </div>
                        )}

                        <div className="absolute top-2 right-2 flex items-center gap-2">
                          {!document?.previewUrl ? (
                            <div className="rounded-lg bg-white p-1.5 shadow-sm">
                              <Camera size={11} className="text-slate-900" />
                            </div>
                          ) : null}
                          {document?.uploaded && uploading !== field.key ? (
                            <div className="w-7 h-7 bg-white/90 rounded-full flex items-center justify-center text-emerald-500 shadow-sm">
                              <CheckCircle2 size={15} strokeWidth={3} />
                            </div>
                          ) : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="bg-amber-50/50 p-4 rounded-2xl flex gap-3 mt-4">
          <AlertCircle size={16} className="text-amber-500 shrink-0" />
          <p className="text-[10px] font-bold text-slate-600 leading-snug">
            Ensure all photos are <span className="text-amber-600 font-black tracking-tight">clear and legible</span>.
          </p>
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-5 bg-white border-t border-slate-50">
          <button
            onClick={handleSubmit}
            disabled={loading || !isComplete}
            className={`w-full h-14 rounded-2xl flex items-center justify-center gap-2 text-[13px] font-black uppercase tracking-widest shadow-lg transition-all ${
              isComplete ? 'bg-slate-900 text-white shadow-slate-900/10' : 'bg-slate-100 text-slate-300 pointer-events-none'
            }`}
          >
            {loading ? 'Submitting...' : 'Review & Submit'} <ShieldCheck size={16} strokeWidth={3} />
          </button>
        </div>
      </main>
    </div>
  );
};

export default StepDocuments;
