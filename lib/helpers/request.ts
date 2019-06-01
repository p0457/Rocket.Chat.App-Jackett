export function setToken(headers, token: string) {
  headers.Cookie = token;
}
