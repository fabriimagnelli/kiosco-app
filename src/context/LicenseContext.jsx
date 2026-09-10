import { createContext, useContext } from "react";

const LicenseContext = createContext(null);

export const LicenseProvider = LicenseContext.Provider;

export const useLicenseState = () => {
  return useContext(LicenseContext);
};
