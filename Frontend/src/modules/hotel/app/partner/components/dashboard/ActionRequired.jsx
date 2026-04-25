
import React from 'react';
import { AlertCircle, UserCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ActionRequired = ({ items }) => {
  const navigate = useNavigate();

  if (!items || items.length === 0) return null;

  return (
    <div className="mb-8 animate-fade-in-up">
      <h3 className="font-bold text-gray-900 mb-4 px-1">Action Required</h3>
      <div className="space-y-3">
        {items.map((item, index) => (
          <div
            key={index}
            onClick={() => navigate(item.link)}
            className={`
                            relative flex items-center p-4 rounded-2xl border cursor-pointer hover:shadow-md transition-all
                            ${item.urgent ? 'bg-red-50 border-red-100' : 'bg-orange-50 border-orange-100'}
                        `}
          >
            <div className={`
                            p-3 rounded-xl mr-4
                            ${item.urgent ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}
                        `}>
              {item.type === 'check-in' ? <UserCheck size={24} /> : <AlertCircle size={24} />}
            </div>
            <div className="flex-1">
              <h4 className={`font-bold ${item.urgent ? 'text-red-800' : 'text-orange-900'}`}>
                {item.title}
              </h4>
              <p className={`text-sm ${item.urgent ? 'text-red-600' : 'text-orange-700'}`}>
                {item.description}
              </p>
            </div>
            <div className="ml-2">
              <button className={`
                                px-4 py-2 rounded-lg text-sm font-bold bg-white shadow-sm
                                ${item.urgent ? 'text-red-600' : 'text-orange-600'}
                            `}>
                Fix Now
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ActionRequired;
