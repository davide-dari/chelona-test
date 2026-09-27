import React from 'react';
import { AddressAndParkingScreen } from './AddressAndParkingScreen';

interface AddressBookScreenProps {
  onClose: () => void;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const AddressBookScreen: React.FC<AddressBookScreenProps> = ({ onClose, showToast }) => {
  return (
    <AddressAndParkingScreen 
      initialTab="addresses" 
      onClose={onClose} 
      showToast={showToast} 
    />
  );
};
