import React from "react";
import logo from "./logo.svg";
import "./App.css";
import mapboxgl from "mapbox-gl";
import data from "./data.location.json";

mapboxgl.accessToken = "pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4M29iazA2Z2gycXA4N2pmbDZmangifQ.-g_vE53SD2WrJ6tFX7QHmA";

class App extends React.Component {
  map;
  
  constructor(props) {
    super(props);

    this.state = {
      locations: []
    };
  }

  componentDidUpdate(){
    this.updateMap();
  }

  mapBoxFeatures = (data) => {
    let features = data.locations.map(item => {
      // Dividing lat and long by 1e7 due to an integer overflow error in location history data
      var lngLat = [item.longitudeE7 / 1e7, item.latitudeE7 / 1e7];
      var feature = {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: lngLat
        }
      };
      return feature;
    });

    return features;
  }

  updateMap() {
    let mapboxFeatures = this.mapBoxFeatures(this.state.locations);
    this.map.getSource("travelledLocations").setData({
      type: "FeatureCollection",
      features: mapboxFeatures
    });
    this.map.setCenter([80,10]);
    this.map.setZoom(2);
  }

  componentDidMount = () => {
    let features = this.mapBoxFeatures(data);

    this.map = new mapboxgl.Map({
      container: this.mapContainer,
      style: "mapbox://styles/mapbox/dark-v10",
      center: [80, 10],
      zoom: 2
    });

    this.map.on("load", () => {
      this.map.addSource("travelledLocations", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: features
        },
        cluster: true,
        clusterMaxZoom: 14, // Max zoom to cluster points on
        clusterRadius: 50 // Radius of each cluster when clustering points (defaults to 50)
      });

      this.map.addLayer({
        id: "clusters",
        type: "circle",
        source: "travelledLocations",
        filter: ["has", "point_count"],
        paint: {
          // Use step expressions (https://docs.mapbox.com/mapbox-gl-js/style-spec/#expressions-step)
          // with three steps to implement three types of circles:
          //   * Blue, 20px circles when point count is less than 100
          //   * Yellow, 30px circles when point count is between 100 and 750
          //   * Pink, 40px circles when point count is greater than or equal to 750
          "circle-color": [
            "step",
            ["get", "point_count"],
            "#51bbd6",
            100,
            "#f1f075",
            750,
            "#f28cb1"
          ],
          "circle-radius": [
            "step",
            ["get", "point_count"],
            20,
            100,
            30,
            750,
            40
          ]
        }
      });

      this.map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "travelledLocations",
        filter: ["has", "point_count"],
        layout: {
          "text-field": "{point_count_abbreviated}",
          "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
          "text-size": 12
        }
      });

      this.map.addLayer({
        id: "unclustered-point",
        type: "circle",
        source: "travelledLocations",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": "#11b4da",
          "circle-radius": 4,
          "circle-stroke-width": 1,
          "circle-stroke-color": "#fff"
        }
      });

      // inspect a cluster on click
      this.map.on("click", "clusters", e => {
        var features = this.map.queryRenderedFeatures(e.point, {
          layers: ["clusters"]
        });
        var clusterId = features[0].properties.cluster_id;
        this.map
          .getSource("travelledLocations")
          .getClusterExpansionZoom(clusterId, (err, zoom) => {
            if (err) return;

            this.map.easeTo({
              center: features[0].geometry.coordinates,
              zoom: zoom
            });
          });
      });

      this.map.on("mouseenter", "clusters", () => {
        this.map.getCanvas().style.cursor = "pointer";
      });
      this.map.on("mouseleave", "clusters", () => {
        this.map.getCanvas().style.cursor = "";
      });
    });
  };

  onChangeHandler = event => {
    var file = event.target.files[0];
    var reader = new FileReader();

    // Read file into memory as UTF-8
    reader.readAsText(file, "UTF-8");

    reader.onload = this.loaded;
    reader.onerror = this.errorHandler;
  };

  loaded = evt => {
    // Obtain the read file data
    var fileString = evt.target.result;

    this.setState({
      locations: JSON.parse(fileString)
    });

  };

  errorHandler = evt => {
    if (evt.target.error.name === "NotReadableError") {
      // The file could not be read
      console.log("Error occurred while reading the file!");
    }
  };

  render() {
    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <h1>
            Google Location History Data Mapping using MapBox and React
          </h1>
          <input
            type="file"
            name="file"
            id="file"
            className="inputfile"
            accept=".json"
            onChange={this.onChangeHandler}
          />
          <label htmlFor="file">Choose a file</label>
        </header>
        <div
          ref={el => (this.mapContainer = el)}
          className="mapContainer absolute top right left bottom"
        />
      </div>
    );
  }
}

export default App;
