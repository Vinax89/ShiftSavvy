import { toast } from "sonner"

// Re-export sonner's toast function to avoid refactoring all components.
// The object is for compatibility with the previous useToast() hook signature.
const useToast = () => {
    return { toast };
}

export { useToast, toast }
