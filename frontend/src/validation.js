export const NAME_MAX_LENGTH = 100;

export function validateUser({ name, email, password, admin }) {
  const errors = {};
  const trimmedName = name.trim();
  const trimmedEmail = email.trim().toLowerCase();
  if (!trimmedName) errors.name = "O nome é obrigatório.";
  else if (trimmedName.length > NAME_MAX_LENGTH)
    errors.name = `O nome deve ter no máximo ${NAME_MAX_LENGTH} caracteres.`;
  const parts = trimmedEmail.split("@");
  if (
    trimmedEmail.length > 254 ||
    parts.length !== 2 ||
    !parts[0] ||
    !parts[1].includes(".") ||
    parts[1].startsWith(".") ||
    parts[1].endsWith(".")
  )
    errors.email = "Informe um e-mail válido.";
  if (password.length < 8 || password.length > 32)
    errors.password = "A senha deve ter entre 8 e 32 caracteres.";
  return {
    errors,
    values: { name: trimmedName, email: trimmedEmail, password, admin },
  };
}
