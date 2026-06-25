import React from 'react';
import { AuthProvider } from '../AuthContext';
import { PatientProvider } from '../PatientContext';
import { AppointmentProvider } from '../AppointmentContext';
import { WaitlistProvider } from '../WaitlistContext';
import { AppProvider } from '../AppContext';

export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <AuthProvider>
      <AppProvider>
        <PatientProvider>
          <AppointmentProvider>
            <WaitlistProvider>
              {children}
            </WaitlistProvider>
          </AppointmentProvider>
        </PatientProvider>
      </AppProvider>
    </AuthProvider>
  );
};
