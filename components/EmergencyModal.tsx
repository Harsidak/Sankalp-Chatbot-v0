import React from 'react';

const CloseIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
);

const PhoneIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="m3.813 2.47.755 2.488a.75.75 0 0 1-.22 1.32l-1.07 1.07a11.39 11.39 0 0 0 4.988 4.988l1.07-1.07a.75.75 0 0 1 1.32-.22l2.488.755a.75.75 0 0 1 .53 1.285l-1.22 1.952a.75.75 0 0 1-1.285.53 13.9 13.9 0 0 1-9.352-9.352.75.75 0 0 1 .53-1.285l1.952-1.22a.75.75 0 0 1 1.285.53Z" clipRule="evenodd" />
    </svg>
);

const ExclamationTriangleIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
    </svg>
);

const indianHelplines = {
  national: [
    { name: 'National Suicide Prevention Helpline', number: '109', note: 'General mental health support.' },
    { name: 'KIRAN Mental Health Rehabilitation', number: '1800-599-0019', note: 'Govt. of India Initiative.' },
    { name: 'National Anti-Ragging Helpline', number: '1800-180-5522', note: 'For students facing ragging.' },
    { name: 'Vandrevala Foundation', number: '9999666555', note: '24/7 emotional support.' },
  ],
  states: [
    { state: 'Andhra Pradesh', name: 'Roshni Trust', number: '040-66202000' },
    { state: 'Delhi', name: 'Sanjivini Society', number: '011-24311918' },
    { state: 'Karnataka', name: 'SAHAI', number: '080-25497777' },
    { state: 'Maharashtra', name: 'AASRA', number: '9820466726' },
    { state: 'Tamil Nadu', name: 'SNEHA', number: '044-24640050' },
    { state: 'West Bengal', name: 'Lifeline Foundation', number: '033-24637401' },
  ],
};

const internationalHotlines = [
    { name: 'Befrienders Worldwide', number: 'Various', note: 'Global emotional support network.' },
    { name: 'Crisis Text Line', number: 'Text HOME to 741741', note: 'For US & Canada.' },
    { name: 'The Trevor Project', number: '1-866-488-7386', note: 'For LGBTQ youth.' },
];

interface EmergencyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const EmergencyModal: React.FC<EmergencyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const renderHelplineCard = (hotline: { name: string, number: string, note?: string }) => (
    <div key={hotline.name} className="flex flex-col sm:flex-row justify-between sm:items-center p-4 bg-interactive rounded-xl border border-divider transition-all hover:border-accent-color-dark-theme/50 hover:bg-interactive-hover">
      <div className="flex-1 mb-3 sm:mb-0">
        <p className="font-semibold text-primary">{hotline.name}</p>
        {hotline.note && <p className="text-xs text-secondary mt-1">{hotline.note}</p>}
      </div>
      <a 
        href={`tel:${hotline.number.replace(/\D/g,'')}`}
        className="flex-shrink-0 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-white bg-accent-color-dark-theme/80 hover:bg-accent-color-dark-theme transition-all shadow-lg hover:shadow-purple-500/40"
      >
        <PhoneIcon className="w-4 h-4" />
        <span>Call {hotline.number}</span>
      </a>
    </div>
  );

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-md z-[70] flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="glass-panel w-full max-w-2xl p-6 flex flex-col gap-6 border-red-500/50 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex justify-between items-start">
            <div className="flex items-center gap-3">
                <ExclamationTriangleIcon className="w-8 h-8 text-red-400" />
                <div>
                    <h2 className="text-2xl font-bold text-red-400">Emergency Support</h2>
                    <p className="text-sm text-secondary">Immediate help is available.</p>
                </div>
            </div>
            <button onClick={onClose} className="p-1 rounded-full text-secondary hover:bg-white/20">
                <CloseIcon />
            </button>
        </header>
        
        <div className="text-sm text-secondary bg-red-500/10 border border-red-500/20 p-4 rounded-xl">
          If you are in immediate danger or a crisis, please contact your local emergency services (like 112 in India). The resources below are for support but are not a substitute for emergency services.
        </div>

        <section className="space-y-4">
            <h3 className="font-semibold text-lg text-primary flex items-center gap-3 border-b border-divider pb-2">
                <i className="fa-solid fa-shield-halved w-5 text-center text-secondary"></i>
                National Indian Helplines
            </h3>
            <div className="space-y-3">
                {indianHelplines.national.map(renderHelplineCard)}
            </div>
        </section>

        <section className="space-y-4">
             <h3 className="font-semibold text-lg text-primary flex items-center gap-3 border-b border-divider pb-2">
                <i className="fa-solid fa-map-location-dot w-5 text-center text-secondary"></i>
                State-wise Helplines
            </h3>
            <div className="space-y-3">
                {indianHelplines.states.map(helpline => renderHelplineCard({ ...helpline, note: `For ${helpline.state}` }))}
            </div>
        </section>

        <section className="space-y-4">
          <h3 className="font-semibold text-lg text-primary flex items-center gap-3 border-b border-divider pb-2">
            <i className="fa-solid fa-globe w-5 text-center text-secondary"></i>
            International Hotlines
          </h3>
          <div className="space-y-3">
            {internationalHotlines.map(renderHelplineCard)}
          </div>
        </section>
      </div>
    </div>
  );
};

export default EmergencyModal;