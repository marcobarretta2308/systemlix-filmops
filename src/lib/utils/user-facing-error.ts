/** Consistent user-facing error copy for production UI */
export function operationFailed(message: string): string {
  const trimmed = message.trim();
  if (!trimmed) return "Operation failed. Please try again.";
  if (
    trimmed.startsWith("Operation failed:") ||
    trimmed.startsWith("Something went wrong:")
  ) {
    return trimmed;
  }
  return `Operation failed: ${trimmed}`;
}

export function somethingWentWrong(message: string): string {
  const trimmed = message.trim();
  if (!trimmed) return "Something went wrong. Please try again.";
  if (
    trimmed.startsWith("Operation failed:") ||
    trimmed.startsWith("Something went wrong:")
  ) {
    return trimmed;
  }
  return `Something went wrong: ${trimmed}`;
}
