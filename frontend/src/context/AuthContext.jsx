import { createContext, useContext } from "react";

const AuthContext = createContext();

export const useAuth = () => {
    return {
        user: {
            role: "admin"
        }
    };
};

export default AuthContext;