import React from 'react';
import { AddressAndParkingScreen } from './AddressAndParkingScreen';

interface ParkingScreenProps {
  onClose: () => void;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const ParkingScreen: React.FC<ParkingScreenProps> = ({ onClose, showToast }) => {
  return (
    <AddressAndParkingScreen 
      initialTab="parking" 
      onClose={onClose} 
      showToast={showToast} 
    />
  );
};
