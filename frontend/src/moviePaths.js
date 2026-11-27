export const MOVIES_PATH = "/inicio";

export function moviePath(movieId) {
  return `${MOVIES_PATH}/filmes/${movieId}`;
}

export function movieIdFromPath(path) {
  return /^\/inicio\/filmes\/([1-9]\d*)\/?$/.exec(path)?.[1] ?? null;
}
