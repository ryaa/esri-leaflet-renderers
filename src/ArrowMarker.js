import L from "leaflet";
import "leaflet-polylinedecorator/src/L.PolylineDecorator";

function getPlacements(placement) {
  switch (placement) {
    case "begin":
      return [0];

    case "end":
      return ["100%"];

    case "begin-end":
      return [0, "100%"];

    default:
      return [];
  }
}

function getArrowPatterns(marker, symbol, styles) {
  var placements = getPlacements(marker.placement || "end");

  if (!placements.length) {
    return [];
  }

  var color = styles.color || "#3388ff";
  var opacity = styles.opacity === undefined ? 1 : styles.opacity;

  if (marker.color) {
    color = symbol.colorValue(marker.color);
    opacity = symbol.alphaValue(marker.color);
  }

  // ArcGIS size is expressed in points; Leaflet uses pixels.
  var pixelSize = !isNaN(marker.size) ? symbol.pixelValue(marker.size) : 15;

  var arrow = L.Symbol.arrowHead({
    pixelSize: pixelSize,
    polygon: true,
    pathOptions: {
      stroke: false,
      fill: true,
      color: color,
      fillColor: color,
      opacity: opacity,
      fillOpacity: opacity,
      interactive: false,
    },
  });

  return placements.map(function (offset) {
    return {
      offset: offset,
      repeat: 0,
      symbol: arrow,
    };
  });
}

export function attachArrowMarker(layer, feature, renderer) {
  if (!layer || !renderer || !feature.geometry) {
    return null;
  }

  var geometryType = feature.geometry.type;

  if (geometryType !== "LineString" && geometryType !== "MultiLineString") {
    return null;
  }

  var symbol = renderer._getSymbol(feature);

  if (!symbol || !symbol._marker || symbol._marker.style !== "arrow") {
    return null;
  }

  var marker = symbol._marker;
  var initialStyles = renderer.style(feature);

  var decorator = L.polylineDecorator(layer, {
    patterns: getArrowPatterns(marker, symbol, initialStyles),
  });

  // Keep decorator synchronized with the feature's style.
  // FeatureLayer calls setStyle() when applying renderer styles.
  var originalSetStyle = layer.setStyle;

  if (originalSetStyle) {
    layer.setStyle = function (styles) {
      originalSetStyle.call(this, styles);

      decorator.setPatterns(getArrowPatterns(marker, symbol, styles || {}));

      return this;
    };
  }

  // A feature can be removed from the map and added again because
  // FeatureLayer caches layers between viewport requests.
  layer.on("add", function () {
    if (layer._map && decorator._map !== layer._map) {
      if (decorator._map) {
        decorator.remove();
      }

      decorator.addTo(layer._map);
    }
  });

  layer.on("remove", function () {
    if (decorator._map) {
      decorator.remove();
    }
  });

  return decorator;
}

export default attachArrowMarker;
