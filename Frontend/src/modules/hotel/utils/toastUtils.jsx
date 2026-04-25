import { toast } from 'react-hot-toast';
import { Heart, CheckCircle } from 'lucide-react';
import React from 'react';

const showSaveToast = (isSaved) => {
    toast.custom((t) => (
        <div
            className={`${t.visible ? 'animate-enter' : 'animate-leave'
                } max-w-md w-full bg-white shadow-lg rounded-xl pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
        >
            <div className="flex-1 w-0 p-4">
                <div className="flex items-start">
                    <div className="flex-shrink-0 pt-0.5">
                        {isSaved ? (
                            <div className="h-10 w-10 rounded-full bg-red-50 flex items-center justify-center">
                                <Heart className="h-6 w-6 text-red-500 fill-red-500" />
                            </div>
                        ) : (
                            <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                                <Heart className="h-6 w-6 text-gray-500" />
                            </div>
                        )}
                    </div>
                    <div className="ml-3 flex-1">
                        <p className="text-sm font-bold text-gray-900">
                            {isSaved ? 'Saved to Favorites' : 'Removed from Favorites'}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                            {isSaved ? 'You can find this hotel in your saved places.' : 'This hotel has been removed from your list.'}
                        </p>
                    </div>
                </div>
            </div>
            <div className="flex border-l border-gray-200">
                <button
                    onClick={() => toast.dismiss(t.id)}
                    className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-bold text-surface focus:outline-none"
                >
                    Close
                </button>
            </div>
        </div>
    ));
};

export default showSaveToast;
