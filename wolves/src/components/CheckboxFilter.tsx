import React from 'react';

interface CheckboxFilterProps {
  title: string;
  options: string[];
  selectedOptions: string[];
  onChange: (updatedSelection: string[]) => void;
}

export const CheckboxFilter: React.FC<CheckboxFilterProps> = ({
  title,
  options,
  selectedOptions,
  onChange,
}) => {
  
  const handleCheckboxChange = (option: string, isChecked: boolean) => {
    if (isChecked) {
      // Add item to the selected array
      onChange([...selectedOptions, option]);
    } else {
      // Remove item from the selected array
      onChange(selectedOptions.filter((item) => item !== option));
    }
  };

  return (
    <div style={{
      padding: '16px',
      backgroundColor: '#ffffff',
      borderRadius: '8px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      border: '1px solid #e2e8f0',
      fontFamily: 'system-ui, sans-serif',
      minWidth: '200px'
    }}>
      <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#475569', fontWeight: 600 }}>
        {title}
      </h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {options.map((option) => {
          const isChecked = selectedOptions.includes(option);
          
          return (
            <label 
              key={option} 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                fontSize: '14px', 
                color: '#334155',
                cursor: 'pointer',
                userSelect: 'none'
              }}
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={(e) => handleCheckboxChange(option, e.target.checked)}
                style={{
                  cursor: 'pointer',
                  width: '16px',
                  height: '16px',
                  accentColor: '#3b82f6' // Gives the checkbox a modern blue accent color
                }}
              />
              <span>{option}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
};