export const MOVIES_PATH = "/inicio";
export const FRIENDS_PATH = `${MOVIES_PATH}/amigos`;

export function moviePath(movieId) {
  return `${MOVIES_PATH}/filmes/${movieId}`;
}

export function movieIdFromPath(path) {
  return /^\/inicio\/filmes\/([1-9]\d*)\/?$/.exec(path)?.[1] ?? null;
}

export function friendMoviesPath(friendId) {
  return `${FRIENDS_PATH}/${friendId}/filmes`;
}

export function friendIdFromPath(path) {
  return /^\/inicio\/amigos\/([1-9]\d*)\/filmes\/?$/.exec(path)?.[1] ?? null;
}

export function isSignedInPath(path) {
  return (
    path === MOVIES_PATH ||
    path === FRIENDS_PATH ||
    Boolean(movieIdFromPath(path) || friendIdFromPath(path))
  );
}
