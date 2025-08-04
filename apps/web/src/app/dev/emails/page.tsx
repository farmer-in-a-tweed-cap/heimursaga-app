'use client';

import { useState } from 'react';

const EMAIL_TEMPLATES = {
  WELCOME: 'welcome',
  PASSWORD_RESET: 'password_reset', 
  EMAIL_VERIFICATION: 'email_verification',
  EXPLORER_PRO_NEW_ENTRY: 'explorer_pro_new_entry',
};

export default function EmailPreviewPage() {
  const [selectedTemplate, setSelectedTemplate] = useState('welcome');
  
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Email Template Preview</h1>
      
      <div className="mb-6">
        <label htmlFor="template-select" className="block text-sm font-medium mb-2">
          Select Template:
        </label>
        <select 
          id="template-select"
          value={selectedTemplate} 
          onChange={(e) => setSelectedTemplate(e.target.value)}
          className="border border-gray-300 p-3 rounded-lg text-lg min-w-[200px]"
        >
          {Object.entries(EMAIL_TEMPLATES).map(([key, value]) => (
            <option key={key} value={value}>
              {key.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
      </div>
      
      <div className="border border-gray-200 rounded-lg overflow-hidden shadow-lg">
        <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
          <span className="text-sm font-medium text-gray-600">
            Template: {selectedTemplate}
          </span>
        </div>
        <iframe 
          src={`/api/dev/email-preview?template=${selectedTemplate}`}
          className="w-full h-[800px] border-0"
          title="Email Preview"
        />
      </div>
      
      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-sm text-yellow-800">
          <strong>Note:</strong> This preview page is for development only. 
          Make sure to remove or protect this route in production.
        </p>
      </div>
    </div>
  );
}