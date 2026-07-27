define("play/UrlHandler", [], function() {
  function getUrlVars() {
    var values = {};
    var query = new URLSearchParams(window.location.search);
    query.forEach(function(value, key) {
      values[key] = value;
    });
    return values;
  }

  return {
    getUrlVars: getUrlVars,
    identifySite: function() {
      return "localhost";
    }
  };
});
