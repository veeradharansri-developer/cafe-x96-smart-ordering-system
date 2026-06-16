/* eslint-disable react-refresh/only-export-components */
import { createContext } from "react";

const AuthContext = createContext();

export const useAuth = () => {
    return {
        user: {
            role: "admin"
        }
    };
};

export default AuthContext;