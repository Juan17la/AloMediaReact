import { createContext } from "react"
import type { User } from "../types/userTypes"

export interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    /** Set the user after a successful login/register (token lives in httpOnly cookie). */
    login: (user: User) => void;
    /** Call the backend logout endpoint and clear local state. */
    logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)
