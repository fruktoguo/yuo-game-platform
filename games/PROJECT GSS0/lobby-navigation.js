(function attachLobbyNavigation(root) {
  "use strict";

  const LAUNCH_PARAMETERS = ["launch_code", "lobby_url"];

  function normalizePath(pathname) {
    const withoutIndex = pathname.replace(/\/index\.html?$/i, "/");
    const withoutTrailingSlash = withoutIndex.replace(/\/+$/, "");
    return withoutTrailingSlash || "/";
  }

  function gameDirectoryPath(current) {
    if (current.pathname.endsWith("/")) return normalizePath(current.pathname);
    const lastSlash = current.pathname.lastIndexOf("/");
    return normalizePath(current.pathname.slice(0, lastSlash + 1));
  }

  function hasLaunchParameters(url) {
    return LAUNCH_PARAMETERS.some((name) => url.searchParams.has(name));
  }

  function pointsToCurrentGame(candidate, current) {
    if (candidate.origin !== current.origin) return false;
    const candidatePath = normalizePath(candidate.pathname);
    const currentPath = normalizePath(current.pathname);
    const gamePath = gameDirectoryPath(current);
    if (candidatePath === currentPath || candidatePath === gamePath) return true;
    return gamePath !== "/" && candidatePath.startsWith(`${gamePath}/`);
  }

  function safeLobbyCandidate(rawValue, current) {
    if (!rawValue) return null;
    try {
      const candidate = new URL(rawValue, current);
      if (!/^https?:$/.test(candidate.protocol)) return null;
      if (hasLaunchParameters(candidate) || pointsToCurrentGame(candidate, current)) return null;
      candidate.hash = "";
      return candidate;
    } catch {
      return null;
    }
  }

  function isLocalHost(hostname) {
    return hostname === "localhost" || hostname === "[::1]" || hostname.startsWith("127.");
  }

  function localLobbyUrl(current) {
    const lobby = new URL("http://127.0.0.1:3100/");
    if (current.protocol === "http:" || current.protocol === "https:") lobby.protocol = current.protocol;
    if (current.hostname && current.hostname !== "[::1]") lobby.hostname = current.hostname;
    return lobby;
  }

  function resolveLobbyUrl(options = {}) {
    const current = new URL(options.currentHref);
    const referrer = safeLobbyCandidate(options.referrer, current);
    if (referrer) return referrer.toString();

    const configured = safeLobbyCandidate(current.searchParams.get("lobby_url"), current);
    if (configured) return configured.toString();

    if (current.protocol === "file:" || isLocalHost(current.hostname)) {
      return localLobbyUrl(current).toString();
    }
    return new URL("/", current.origin).toString();
  }

  root.GSS0LobbyNavigation = Object.freeze({ resolveLobbyUrl });
})(globalThis);
