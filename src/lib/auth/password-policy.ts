// Supabase Auth exige la misma política (largo 10; minúsculas, mayúsculas, dígitos y símbolos).

export const PASSWORD_MIN_LENGTH = 10;
// bcrypt, que usa Supabase Auth, ignora lo que pase de 72 bytes.
export const PASSWORD_MAX_LENGTH = 72;

// Mismo conjunto de símbolos que reconoce Supabase Auth: una letra con
// tilde o un espacio no cuentan como símbolo allá, así que tampoco aquí.
const SYMBOLS = "!@#$%^&*()_+-=[]{};'\\:\"|<>?,./`~";

export type PasswordRule = {
  id: "length" | "lower" | "upper" | "digit" | "symbol";
  label: string;
  test: (password: string) => boolean;
};

export const PASSWORD_RULES: readonly PasswordRule[] = [
  {
    id: "length",
    label: `Al menos ${PASSWORD_MIN_LENGTH} caracteres`,
    test: (password) => password.length >= PASSWORD_MIN_LENGTH,
  },
  { id: "lower", label: "Una letra minúscula", test: (password) => /[a-z]/.test(password) },
  { id: "upper", label: "Una letra mayúscula", test: (password) => /[A-Z]/.test(password) },
  { id: "digit", label: "Un número", test: (password) => /[0-9]/.test(password) },
  {
    id: "symbol",
    label: "Un símbolo, por ejemplo ! ? # @ $ %",
    test: (password) => [...password].some((char) => SYMBOLS.includes(char)),
  },
];

// Con `email`, la contraseña no puede contener la parte antes de la @.
export function validatePassword(password: string, email?: string): string | null {
  if (new TextEncoder().encode(password).length > PASSWORD_MAX_LENGTH) {
    return `La contraseña es demasiado larga: usa como máximo ${PASSWORD_MAX_LENGTH} caracteres.`;
  }

  const missing = PASSWORD_RULES.filter((rule) => !rule.test(password));
  if (missing.length > 0) {
    return `A tu contraseña le falta: ${missing.map((rule) => rule.label.toLowerCase()).join(", ")}.`;
  }

  const localPart = email?.split("@")[0]?.toLowerCase() ?? "";
  if (localPart.length >= 4 && password.toLowerCase().includes(localPart)) {
    return "Tu contraseña no puede contener tu correo.";
  }

  return null;
}
