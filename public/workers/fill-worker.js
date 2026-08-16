var PI = Math.PI;
function wrap180(lon) {
  return ((lon + 540) % 360) - 180;
}
function vec3(lon, lat) {
  var phi = ((90 - lat) * PI) / 180,
    th = ((lon + 180) * PI) / 180;
  return [-Math.sin(phi) * Math.cos(th), Math.cos(phi), Math.sin(phi) * Math.sin(th)];
}
function unwrapRing(ring, refLon) {
  var out = new Array(ring.length),
    prev = null;
  for (var i = 0; i < ring.length; i++) {
    var L = ring[i][0],
      A = ring[i][1];
    var d = L - refLon;
    if (d > 180) L -= 360;
    else if (d < -180) L += 360;
    if (prev) {
      var step = L - prev[0];
      if (step > 180) L -= 360;
      else if (step < -180) L += 360;
    }
    out[i] = [L, A];
    prev = out[i];
  }
  return out;
}
function pointInRing(pt, ring) {
  var x = pt[0],
    y = pt[1],
    inside = false,
    n = ring.length;
  for (var i = 0, j = n - 1; i < n; j = i++) {
    var xi = ring[i][0],
      yi = ring[i][1];
    var xj = ring[j][0],
      yj = ring[j][1];
    var denom = yj - yi;
    if (denom === 0) continue;
    var inter = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / denom + xi;
    if (inter) inside = !inside;
  }
  return inside;
}
function containsUnwrapped(poly, refLon, lon, lat) {
  var rings = poly.coordinates;
  if (!rings || !rings.length) return false;
  var r0 = unwrapRing(rings[0], refLon);
  var pt = [lon, lat];
  if (!pointInRing(pt, r0)) return false;
  for (var k = 1; k < rings.length; k++) {
    var rk = unwrapRing(rings[k], refLon);
    if (pointInRing(pt, rk)) return false;
  }
  return true;
}
function bbox(r) {
  var minLon = 1e9,
    maxLon = -1e9,
    minLat = 90,
    maxLat = -90;
  for (var i = 0; i < r.length; i++) {
    var L = r[i][0],
      A = r[i][1];
    if (L < minLon) minLon = L;
    if (L > maxLon) maxLon = L;
    if (A < minLat) minLat = A;
    if (A > maxLat) maxLat = A;
  }
  return { minLon, maxLon, minLat, maxLat };
}

onmessage = function (e) {
  var geos = e.data.geos,
    step = Math.max(0.2, Math.min(6.0, e.data.tileDeg || 1.0));
  var out = [];
  for (var p = 0; p < geos.length; p++) {
    var r0 = unwrapRing(geos[p].coordinates[0], 0);
    var bb = bbox(r0);
    var refLon = (bb.minLon + bb.maxLon) / 2;
    r0 = unwrapRing(geos[p].coordinates[0], refLon);
    bb = bbox(r0);

    var latStart = Math.floor((bb.minLat - 1) / step) * step;
    var latEnd = Math.ceil((bb.maxLat + 1) / step) * step;

    for (var lat = latStart; lat <= latEnd; lat += step) {
      var odd = Math.round(Math.abs(lat / step)) % 2;
      var lonStart = Math.floor((bb.minLon - 1) / step) * step + (odd ? step * 0.5 : 0);
      var lonEnd = Math.ceil((bb.maxLon + 1) / step) * step;
      for (var lon = lonStart; lon <= lonEnd; lon += step) {
        var llLon = lon,
          llLat = Math.max(-90, Math.min(90, lat));
        if (containsUnwrapped(geos[p], refLon, llLon, llLat)) {
          var v = vec3(wrap180(llLon), llLat);
          out.push(v[0], v[1], v[2]);
        }
      }
    }
  }
  var arr = new Float32Array(out);
  postMessage({ ok: true, fill: arr }, [arr.buffer]);
};
