/**
 * Backport of projectionDataCache and getProjectionData from api-sitna version 4.8.0
 * Source: https://raw.githubusercontent.com/sitna/api-sitna/81c6aab18e544da18c951fa6f0ab8f8a9ebe9b15/TC.js
 *
 * This module contains the backported implementation of:
 * - projectionDataCache: Pre-loaded cache of common EPSG projection definitions
 * - getProjectionData: Function to retrieve projection data (sync/async)
 * - initializeProj4Definitions: Function to initialize proj4 definitions for geographic projections
 */

export interface ProjectionData {
  code: string;
  kind: string;
  name: string;
  wkt: string;
  proj4: string;
  bbox: number[];
  unit: string | null;
  accuracy: number | null;
}

export interface GetProjectionDataOptions {
  crs?: string;
  sync?: boolean;
}

export interface TCNamespace {
  apiLocation?: string;
  getProjectionData?: (options?: GetProjectionDataOptions) => ProjectionData | Promise<ProjectionData | false>;
  projectionDataCache?: Record<string, ProjectionData>;
  [key: string]: unknown;
}

// Backported projectionDataCache from TC.js (as-is)
export const projectionDataCache: Record<string, ProjectionData> = {
  // Precargamos los códigos más usados
  '25830': {
    code: "25830",
    kind: "CRS-PROJCRS",
    name: "ETRS89 / UTM zone 30N",
    wkt: 'PROJCRS["ETRS89 / UTM zone 30N",BASEGEOGCRS["ETRS89",ENSEMBLE["European Terrestrial Reference System 1989 ensemble", MEMBER["European Terrestrial Reference Frame 1989", ID["EPSG",1178]], MEMBER["European Terrestrial Reference Frame 1990", ID["EPSG",1179]], MEMBER["European Terrestrial Reference Frame 1991", ID["EPSG",1180]], MEMBER["European Terrestrial Reference Frame 1992", ID["EPSG",1181]], MEMBER["European Terrestrial Reference Frame 1993", ID["EPSG",1182]], MEMBER["European Terrestrial Reference Frame 1994", ID["EPSG",1183]], MEMBER["European Terrestrial Reference Frame 1996", ID["EPSG",1184]], MEMBER["European Terrestrial Reference Frame 1997", ID["EPSG",1185]], MEMBER["European Terrestrial Reference Frame 2000", ID["EPSG",1186]], MEMBER["European Terrestrial Reference Frame 2005", ID["EPSG",1204]], MEMBER["European Terrestrial Reference Frame 2014", ID["EPSG",1206]], MEMBER["European Terrestrial Reference Frame 2020", ID["EPSG",1382]], ELLIPSOID["GRS 1980",6378137,298.257222101,LENGTHUNIT["metre",1,ID["EPSG",9001]],ID["EPSG",7019]], ENSEMBLEACCURACY[0.1],ID["EPSG",6258]],ID["EPSG",4258]],CONVERSION["UTM zone 30N",METHOD["Transverse Mercator",ID["EPSG",9807]],PARAMETER["Latitude of natural origin",0,ANGLEUNIT["degree",0.0174532925199433,ID["EPSG",9102]],ID["EPSG",8801]],PARAMETER["Longitude of natural origin",-3,ANGLEUNIT["degree",0.0174532925199433,ID["EPSG",9102]],ID["EPSG",8802]],PARAMETER["Scale factor at natural origin",0.9996,SCALEUNIT["unity",1,ID["EPSG",9201]],ID["EPSG",8805]],PARAMETER["False easting",500000,LENGTHUNIT["metre",1,ID["EPSG",9001]],ID["EPSG",8806]],PARAMETER["False northing",0,LENGTHUNIT["metre",1,ID["EPSG",9001]],ID["EPSG",8807]],ID["EPSG",16030]],CS[Cartesian,2,ID["EPSG",4400]],AXIS["Easting (E)",east],AXIS["Northing (N)",north],LENGTHUNIT["metre",1,ID["EPSG",9001]],ID["EPSG",25830]]',
    proj4: "+proj=utm +zone=30 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs",
    bbox: [80.49, -6, 35.26, 0.01],
    unit: "metre",
    accuracy: 1
  },
  '4326': {
    code: "4326",
    kind: "CRS-GEOGCRS",
    name: "WGS 84",
    wkt: 'GEOGCRS["WGS 84",ENSEMBLE["World Geodetic System 1984 ensemble", MEMBER["World Geodetic System 1984 (Transit)", ID["EPSG",1166]], MEMBER["World Geodetic System 1984 (G730)", ID["EPSG",1152]], MEMBER["World Geodetic System 1984 (G873)", ID["EPSG",1153]], MEMBER["World Geodetic System 1984 (G1150)", ID["EPSG",1154]], MEMBER["World Geodetic System 1984 (G1674)", ID["EPSG",1155]], MEMBER["World Geodetic System 1984 (G1762)", ID["EPSG",1156]], MEMBER["World Geodetic System 1984 (G2139)", ID["EPSG",1309]], MEMBER["World Geodetic System 1984 (G2296)", ID["EPSG",1383]], ELLIPSOID["WGS 84",6378137,298.257223563,LENGTHUNIT["metre",1,ID["EPSG",9001]],ID["EPSG",7030]], ENSEMBLEACCURACY[2],ID["EPSG",6326]],CS[ellipsoidal,2,ID["EPSG",6422]],AXIS["Geodetic latitude (Lat)",north],AXIS["Geodetic longitude (Lon)",east],ANGLEUNIT["degree",0.0174532925199433,ID["EPSG",9102]],ID["EPSG",4326]]',
    proj4: "+proj=longlat +datum=WGS84 +no_defs +type=crs",
    bbox: [90, -180, -90, 180],
    unit: "degree",
    accuracy: null
  },
  '3857': {
    code: "3857",
    kind: "CRS-PROJCRS",
    name: "WGS 84 / Pseudo-Mercator",
    wkt: 'PROJCRS["WGS 84 / Pseudo-Mercator",BASEGEOGCRS["WGS 84",ENSEMBLE["World Geodetic System 1984 ensemble", MEMBER["World Geodetic System 1984 (Transit)", ID["EPSG",1166]], MEMBER["World Geodetic System 1984 (G730)", ID["EPSG",1152]], MEMBER["World Geodetic System 1984 (G873)", ID["EPSG",1153]], MEMBER["World Geodetic System 1984 (G1150)", ID["EPSG",1154]], MEMBER["World Geodetic System 1984 (G1674)", ID["EPSG",1155]], MEMBER["World Geodetic System 1984 (G1762)", ID["EPSG",1156]], MEMBER["World Geodetic System 1984 (G2139)", ID["EPSG",1309]], MEMBER["World Geodetic System 1984 (G2296)", ID["EPSG",1383]], ELLIPSOID["WGS 84",6378137,298.257223563,LENGTHUNIT["metre",1,ID["EPSG",9001]],ID["EPSG",7030]], ENSEMBLEACCURACY[2],ID["EPSG",6326]],ID["EPSG",4326]],CONVERSION["Popular Visualisation Pseudo-Mercator",METHOD["Popular Visualisation Pseudo Mercator",ID["EPSG",1024]],PARAMETER["Latitude of natural origin",0,ANGLEUNIT["degree",0.0174532925199433,ID["EPSG",9102]],ID["EPSG",8801]],PARAMETER["Longitude of natural origin",0,ANGLEUNIT["degree",0.0174532925199433,ID["EPSG",9102]],ID["EPSG",8802]],PARAMETER["False easting",0,LENGTHUNIT["metre",1,ID["EPSG",9001]],ID["EPSG",8806]],PARAMETER["False northing",0,LENGTHUNIT["metre",1,ID["EPSG",9001]],ID["EPSG",8807]],ID["EPSG",3856]],CS[Cartesian,2,ID["EPSG",4499]],AXIS["Easting (X)",east],AXIS["Northing (Y)",north],LENGTHUNIT["metre",1,ID["EPSG",9001]],ID["EPSG",3857]]',
    proj4: "+proj=merc +a=6378137 +b=6378137 +lat_ts=0 +lon_0=0 +x_0=0 +y_0=0 +k=1 +units=m +nadgrids=@null +wktext +no_defs +type=crs",
    bbox: [85.06, -180, -85.06, 180],
    unit: "metre",
    accuracy: null
  },
  '900913': {
    code: "900913",
    kind: "CRS-PROJCRS",
    name: "Google Maps Global Mercator",
    wkt: 'PROJCRS["Google_Maps_Global_Mercator",BASEGEOGCRS["WGS 84",DATUM["World Geodetic System 1984",ELLIPSOID["WGS 84",6378137,298.257223563,LENGTHUNIT["metre",1]]],PRIMEM["Greenwich",0,ANGLEUNIT["degree",0.0174532925199433]],ID["EPSG",4326]],CONVERSION["unnamed",METHOD["Popular Visualisation Pseudo Mercator",ID["EPSG",1024]],PARAMETER["Latitude of natural origin",0,ANGLEUNIT["degree",0.0174532925199433],ID["EPSG",8801]],PARAMETER["Longitude of natural origin",0,ANGLEUNIT["degree",0.0174532925199433],ID["EPSG",8802]],PARAMETER["False easting",0,LENGTHUNIT["metre",1],ID["EPSG",8806]],PARAMETER["False northing",0,LENGTHUNIT["metre",1],ID["EPSG",8807]]],CS[Cartesian,2],AXIS["(E)",east,ORDER[1],LENGTHUNIT["metre",1]],AXIS["(N)",north,ORDER[2],LENGTHUNIT["metre",1]],ID["EPSG",900913]]',
    proj4: "+proj=merc +a=6378137 +b=6378137 +lat_ts=0 +lon_0=0 +x_0=0 +y_0=0 +k=1 +units=m +nadgrids=@null +wktext +no_defs +type=crs",
    bbox: [0, 0, 0, 0],
    unit: null,
    accuracy: null
  },
  '25828': {
    code: "25828",
    kind: "CRS-PROJCRS",
    name: "ETRS89 / UTM zone 28N",
    wkt: 'PROJCRS["ETRS89 / UTM zone 28N",BASEGEOGCRS["ETRS89",ENSEMBLE["European Terrestrial Reference System 1989 ensemble", MEMBER["European Terrestrial Reference Frame 1989", ID["EPSG",1178]], MEMBER["European Terrestrial Reference Frame 1990", ID["EPSG",1179]], MEMBER["European Terrestrial Reference Frame 1991", ID["EPSG",1180]], MEMBER["European Terrestrial Reference Frame 1992", ID["EPSG",1181]], MEMBER["European Terrestrial Reference Frame 1993", ID["EPSG",1182]], MEMBER["European Terrestrial Reference Frame 1994", ID["EPSG",1183]], MEMBER["European Terrestrial Reference Frame 1996", ID["EPSG",1184]], MEMBER["European Terrestrial Reference Frame 1997", ID["EPSG",1185]], MEMBER["European Terrestrial Reference Frame 2000", ID["EPSG",1186]], MEMBER["European Terrestrial Reference Frame 2005", ID["EPSG",1204]], MEMBER["European Terrestrial Reference Frame 2014", ID["EPSG",1206]], MEMBER["European Terrestrial Reference Frame 2020", ID["EPSG",1382]], ELLIPSOID["GRS 1980",6378137,298.257222101,LENGTHUNIT["metre",1,ID["EPSG",9001]],ID["EPSG",7019]], ENSEMBLEACCURACY[0.1],ID["EPSG",6258]],ID["EPSG",4258]],CONVERSION["UTM zone 28N",METHOD["Transverse Mercator",ID["EPSG",9807]],PARAMETER["Latitude of natural origin",0,ANGLEUNIT["degree",0.0174532925199433,ID["EPSG",9102]],ID["EPSG",8801]],PARAMETER["Longitude of natural origin",-15,ANGLEUNIT["degree",0.0174532925199433,ID["EPSG",9102]],ID["EPSG",8802]],PARAMETER["Scale factor at natural origin",0.9996,SCALEUNIT["unity",1,ID["EPSG",9201]],ID["EPSG",8805]],PARAMETER["False easting",500000,LENGTHUNIT["metre",1,ID["EPSG",9001]],ID["EPSG",8806]],PARAMETER["False northing",0,LENGTHUNIT["metre",1,ID["EPSG",9001]],ID["EPSG",8807]],ID["EPSG",16028]],CS[Cartesian,2,ID["EPSG",4400]],AXIS["Easting (E)",east],AXIS["Northing (N)",north],LENGTHUNIT["metre",1,ID["EPSG",9001]],ID["EPSG",25828]]',
    proj4: "+proj=utm +zone=28 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs",
    bbox: [72.44, -16.1, 34.93, -11.99],
    unit: "metre",
    accuracy: 1
  },
  '25829': {
    code: "25829",
    kind: "CRS-PROJCRS",
    name: "ETRS89 / UTM zone 29N",
    wkt: 'PROJCRS["ETRS89 / UTM zone 29N",BASEGEOGCRS["ETRS89",ENSEMBLE["European Terrestrial Reference System 1989 ensemble", MEMBER["European Terrestrial Reference Frame 1989", ID["EPSG",1178]], MEMBER["European Terrestrial Reference Frame 1990", ID["EPSG",1179]], MEMBER["European Terrestrial Reference Frame 1991", ID["EPSG",1180]], MEMBER["European Terrestrial Reference Frame 1992", ID["EPSG",1181]], MEMBER["European Terrestrial Reference Frame 1993", ID["EPSG",1182]], MEMBER["European Terrestrial Reference Frame 1994", ID["EPSG",1183]], MEMBER["European Terrestrial Reference Frame 1996", ID["EPSG",1184]], MEMBER["European Terrestrial Reference Frame 1997", ID["EPSG",1185]], MEMBER["European Terrestrial Reference Frame 2000", ID["EPSG",1186]], MEMBER["European Terrestrial Reference Frame 2005", ID["EPSG",1204]], MEMBER["European Terrestrial Reference Frame 2014", ID["EPSG",1206]], MEMBER["European Terrestrial Reference Frame 2020", ID["EPSG",1382]], ELLIPSOID["GRS 1980",6378137,298.257222101,LENGTHUNIT["metre",1,ID["EPSG",9001]],ID["EPSG",7019]], ENSEMBLEACCURACY[0.1],ID["EPSG",6258]],ID["EPSG",4258]],CONVERSION["UTM zone 29N",METHOD["Transverse Mercator",ID["EPSG",9807]],PARAMETER["Latitude of natural origin",0,ANGLEUNIT["degree",0.0174532925199433,ID["EPSG",9102]],ID["EPSG",8801]],PARAMETER["Longitude of natural origin",-9,ANGLEUNIT["degree",0.0174532925199433,ID["EPSG",9102]],ID["EPSG",8802]],PARAMETER["Scale factor at natural origin",0.9996,SCALEUNIT["unity",1,ID["EPSG",9201]],ID["EPSG",8805]],PARAMETER["False easting",500000,LENGTHUNIT["metre",1,ID["EPSG",9001]],ID["EPSG",8806]],PARAMETER["False northing",0,LENGTHUNIT["metre",1,ID["EPSG",9001]],ID["EPSG",8807]],ID["EPSG",16029]],CS[Cartesian,2,ID["EPSG",4400]],AXIS["Easting (E)",east],AXIS["Northing (N)",north],LENGTHUNIT["metre",1,ID["EPSG",9001]],ID["EPSG",25829]]',
    proj4: "+proj=utm +zone=29 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs",
    bbox: [74.13, -12, 34.91, -6],
    unit: "metre",
    accuracy: 1
  },
  '25831': {
    code: "25831",
    kind: "CRS-PROJCRS",
    name: "ETRS89 / UTM zone 31N",
    wkt: 'PROJCRS["ETRS89 / UTM zone 31N",BASEGEOGCRS["ETRS89",ENSEMBLE["European Terrestrial Reference System 1989 ensemble", MEMBER["European Terrestrial Reference Frame 1989", ID["EPSG",1178]], MEMBER["European Terrestrial Reference Frame 1990", ID["EPSG",1179]], MEMBER["European Terrestrial Reference Frame 1991", ID["EPSG",1180]], MEMBER["European Terrestrial Reference Frame 1992", ID["EPSG",1181]], MEMBER["European Terrestrial Reference Frame 1993", ID["EPSG",1182]], MEMBER["European Terrestrial Reference Frame 1994", ID["EPSG",1183]], MEMBER["European Terrestrial Reference Frame 1996", ID["EPSG",1184]], MEMBER["European Terrestrial Reference Frame 1997", ID["EPSG",1185]], MEMBER["European Terrestrial Reference Frame 2000", ID["EPSG",1186]], MEMBER["European Terrestrial Reference Frame 2005", ID["EPSG",1204]], MEMBER["European Terrestrial Reference Frame 2014", ID["EPSG",1206]], MEMBER["European Terrestrial Reference Frame 2020", ID["EPSG",1382]], ELLIPSOID["GRS 1980",6378137,298.257222101,LENGTHUNIT["metre",1,ID["EPSG",9001]],ID["EPSG",7019]], ENSEMBLEACCURACY[0.1],ID["EPSG",6258]],ID["EPSG",4258]],CONVERSION["UTM zone 31N",METHOD["Transverse Mercator",ID["EPSG",9807]],PARAMETER["Latitude of natural origin",0,ANGLEUNIT["degree",0.0174532925199433,ID["EPSG",9102]],ID["EPSG",8801]],PARAMETER["Longitude of natural origin",3,ANGLEUNIT["degree",0.0174532925199433,ID["EPSG",9102]],ID["EPSG",8802]],PARAMETER["Scale factor at natural origin",0.9996,SCALEUNIT["unity",1,ID["EPSG",9201]],ID["EPSG",8805]],PARAMETER["False easting",500000,LENGTHUNIT["metre",1,ID["EPSG",9001]],ID["EPSG",8806]],PARAMETER["False northing",0,LENGTHUNIT["metre",1,ID["EPSG",9001]],ID["EPSG",8807]],ID["EPSG",16031]],CS[Cartesian,2,ID["EPSG",4400]],AXIS["Easting (E)",east],AXIS["Northing (N)",north],LENGTHUNIT["metre",1,ID["EPSG",9001]],ID["EPSG",25831]]',
    proj4: "+proj=utm +zone=31 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs",
    bbox: [82.45, 0, 37, 6.01],
    unit: "metre",
    accuracy: 1
  },
  '23030': {
    code: "23030",
    kind: "CRS-PROJCRS",
    name: "ED50 / UTM zone 30N",
    wkt: 'PROJCRS["ED50 / UTM zone 30N",BASEGEOGCRS["ED50",DATUM["European Datum 1950",ELLIPSOID["International 1924",6378388,297,LENGTHUNIT["metre",1,ID["EPSG",9001]],ID["EPSG",7022]],ID["EPSG",6230]],ID["EPSG",4230]],CONVERSION["UTM zone 30N",METHOD["Transverse Mercator",ID["EPSG",9807]],PARAMETER["Latitude of natural origin",0,ANGLEUNIT["degree",0.0174532925199433,ID["EPSG",9102]],ID["EPSG",8801]],PARAMETER["Longitude of natural origin",-3,ANGLEUNIT["degree",0.0174532925199433,ID["EPSG",9102]],ID["EPSG",8802]],PARAMETER["Scale factor at natural origin",0.9996,SCALEUNIT["unity",1,ID["EPSG",9201]],ID["EPSG",8805]],PARAMETER["False easting",500000,LENGTHUNIT["metre",1,ID["EPSG",9001]],ID["EPSG",8806]],PARAMETER["False northing",0,LENGTHUNIT["metre",1,ID["EPSG",9001]],ID["EPSG",8807]],ID["EPSG",16030]],CS[Cartesian,2,ID["EPSG",4400]],AXIS["Easting (E)",east],AXIS["Northing (N)",north],LENGTHUNIT["metre",1,ID["EPSG",9001]],ID["EPSG",23030]]',
    proj4: "+proj=utm +zone=30 +ellps=intl +towgs84=-87,-98,-121,0,0,0,0 +units=m +no_defs +type=crs",
    bbox: [80.49, -6, 35.26, 0.01],
    unit: "metre",
    accuracy: 10
  },
  '23028': {
    code: "23028",
    kind: "CRS-PROJCRS",
    name: "ED50 / UTM zone 28N",
    wkt: 'PROJCRS["ED50 / UTM zone 28N",BASEGEOGCRS["ED50",DATUM["European Datum 1950",ELLIPSOID["International 1924",6378388,297,LENGTHUNIT["metre",1,ID["EPSG",9001]],ID["EPSG",7022]],ID["EPSG",6230]],ID["EPSG",4230]],CONVERSION["UTM zone 28N",METHOD["Transverse Mercator",ID["EPSG",9807]],PARAMETER["Latitude of natural origin",0,ANGLEUNIT["degree",0.0174532925199433,ID["EPSG",9102]],ID["EPSG",8801]],PARAMETER["Longitude of natural origin",-15,ANGLEUNIT["degree",0.0174532925199433,ID["EPSG",9102]],ID["EPSG",8802]],PARAMETER["Scale factor at natural origin",0.9996,SCALEUNIT["unity",1,ID["EPSG",9201]],ID["EPSG",8805]],PARAMETER["False easting",500000,LENGTHUNIT["metre",1,ID["EPSG",9001]],ID["EPSG",8806]],PARAMETER["False northing",0,LENGTHUNIT["metre",1,ID["EPSG",9001]],ID["EPSG",8807]],ID["EPSG",16028]],CS[Cartesian,2,ID["EPSG",4400]],AXIS["Easting (E)",east],AXIS["Northing (N)",north],LENGTHUNIT["metre",1,ID["EPSG",9001]],ID["EPSG",23028]]',
    proj4: "+proj=utm +zone=28 +ellps=intl +towgs84=-87,-98,-121,0,0,0,0 +units=m +no_defs +type=crs",
    bbox: [56.57, -16.1, 48.43, -12],
    unit: "metre",
    accuracy: 10
  },
  '23029': {
    code: "23029",
    kind: "CRS-PROJCRS",
    name: "ED50 / UTM zone 29N",
    wkt: 'PROJCRS["ED50 / UTM zone 29N",BASEGEOGCRS["ED50",DATUM["European Datum 1950",ELLIPSOID["International 1924",6378388,297,LENGTHUNIT["metre",1,ID["EPSG",9001]],ID["EPSG",7022]],ID["EPSG",6230]],ID["EPSG",4230]],CONVERSION["UTM zone 29N",METHOD["Transverse Mercator",ID["EPSG",9807]],PARAMETER["Latitude of natural origin",0,ANGLEUNIT["degree",0.0174532925199433,ID["EPSG",9102]],ID["EPSG",8801]],PARAMETER["Longitude of natural origin",-9,ANGLEUNIT["degree",0.0174532925199433,ID["EPSG",9102]],ID["EPSG",8802]],PARAMETER["Scale factor at natural origin",0.9996,SCALEUNIT["unity",1,ID["EPSG",9201]],ID["EPSG",8805]],PARAMETER["False easting",500000,LENGTHUNIT["metre",1,ID["EPSG",9001]],ID["EPSG",8806]],PARAMETER["False northing",0,LENGTHUNIT["metre",1,ID["EPSG",9001]],ID["EPSG",8807]],ID["EPSG",16029]],CS[Cartesian,2,ID["EPSG",4400]],AXIS["Easting (E)",east],AXIS["Northing (N)",north],LENGTHUNIT["metre",1,ID["EPSG",9001]],ID["EPSG",23029]]',
    proj4: "+proj=utm +zone=29 +ellps=intl +towgs84=-87,-98,-121,0,0,0,0 +units=m +no_defs +type=crs",
    bbox: [62.41, -12, 36.13, -6],
    unit: "metre",
    accuracy: 10
  },
  '23031': {
    code: "23031",
    kind: "CRS-PROJCRS",
    name: "ED50 / UTM zone 31N",
    wkt: 'PROJCRS["ED50 / UTM zone 31N",BASEGEOGCRS["ED50",DATUM["European Datum 1950",ELLIPSOID["International 1924",6378388,297,LENGTHUNIT["metre",1,ID["EPSG",9001]],ID["EPSG",7022]],ID["EPSG",6230]],ID["EPSG",4230]],CONVERSION["UTM zone 31N",METHOD["Transverse Mercator",ID["EPSG",9807]],PARAMETER["Latitude of natural origin",0,ANGLEUNIT["degree",0.0174532925199433,ID["EPSG",9102]],ID["EPSG",8801]],PARAMETER["Longitude of natural origin",3,ANGLEUNIT["degree",0.0174532925199433,ID["EPSG",9102]],ID["EPSG",8802]],PARAMETER["Scale factor at natural origin",0.9996,SCALEUNIT["unity",1,ID["EPSG",9201]],ID["EPSG",8805]],PARAMETER["False easting",500000,LENGTHUNIT["metre",1,ID["EPSG",9001]],ID["EPSG",8806]],PARAMETER["False northing",0,LENGTHUNIT["metre",1,ID["EPSG",9001]],ID["EPSG",8807]],ID["EPSG",16031]],CS[Cartesian,2,ID["EPSG",4400]],AXIS["Easting (E)",east],AXIS["Northing (N)",north],LENGTHUNIT["metre",1,ID["EPSG",9001]],ID["EPSG",23031]]',
    proj4: "+proj=utm +zone=31 +ellps=intl +towgs84=-87,-98,-121,0,0,0,0 +units=m +no_defs +type=crs",
    bbox: [82.45, 0, 38.56, 6.01],
    unit: "metre",
    accuracy: 10
  },
  '32630': {
    code: "32630",
    kind: "CRS-PROJCRS",
    name: "WGS 84 / UTM zone 30N",
    wkt: 'PROJCRS["WGS 84 / UTM zone 30N",BASEGEOGCRS["WGS 84",ENSEMBLE["World Geodetic System 1984 ensemble", MEMBER["World Geodetic System 1984 (Transit)", ID["EPSG",1166]], MEMBER["World Geodetic System 1984 (G730)", ID["EPSG",1152]], MEMBER["World Geodetic System 1984 (G873)", ID["EPSG",1153]], MEMBER["World Geodetic System 1984 (G1150)", ID["EPSG",1154]], MEMBER["World Geodetic System 1984 (G1674)", ID["EPSG",1155]], MEMBER["World Geodetic System 1984 (G1762)", ID["EPSG",1156]], MEMBER["World Geodetic System 1984 (G2139)", ID["EPSG",1309]], MEMBER["World Geodetic System 1984 (G2296)", ID["EPSG",1383]], ELLIPSOID["WGS 84",6378137,298.257223563,LENGTHUNIT["metre",1,ID["EPSG",9001]],ID["EPSG",7030]], ENSEMBLEACCURACY[2],ID["EPSG",6326]],ID["EPSG",4326]],CONVERSION["UTM zone 30N",METHOD["Transverse Mercator",ID["EPSG",9807]],PARAMETER["Latitude of natural origin",0,ANGLEUNIT["degree",0.0174532925199433,ID["EPSG",9102]],ID["EPSG",8801]],PARAMETER["Longitude of natural origin",-3,ANGLEUNIT["degree",0.0174532925199433,ID["EPSG",9102]],ID["EPSG",8802]],PARAMETER["Scale factor at natural origin",0.9996,SCALEUNIT["unity",1,ID["EPSG",9201]],ID["EPSG",8805]],PARAMETER["False easting",500000,LENGTHUNIT["metre",1,ID["EPSG",9001]],ID["EPSG",8806]],PARAMETER["False northing",0,LENGTHUNIT["metre",1,ID["EPSG",9001]],ID["EPSG",8807]],ID["EPSG",16030]],CS[Cartesian,2,ID["EPSG",4400]],AXIS["Easting (E)",east],AXIS["Northing (N)",north],LENGTHUNIT["metre",1,ID["EPSG",9001]],ID["EPSG",32630]]',
    proj4: "+proj=utm +zone=30 +datum=WGS84 +units=m +no_defs +type=crs",
    bbox: [84, -6, 0, 0],
    unit: "metre",
    accuracy: null
  },
  '32628': {
    code: "32628",
    kind: "CRS-PROJCRS",
    name: "WGS 84 / UTM zone 28N",
    wkt: 'PROJCRS["WGS 84 / UTM zone 28N",BASEGEOGCRS["WGS 84",ENSEMBLE["World Geodetic System 1984 ensemble", MEMBER["World Geodetic System 1984 (Transit)", ID["EPSG",1166]], MEMBER["World Geodetic System 1984 (G730)", ID["EPSG",1152]], MEMBER["World Geodetic System 1984 (G873)", ID["EPSG",1153]], MEMBER["World Geodetic System 1984 (G1150)", ID["EPSG",1154]], MEMBER["World Geodetic System 1984 (G1674)", ID["EPSG",1155]], MEMBER["World Geodetic System 1984 (G1762)", ID["EPSG",1156]], MEMBER["World Geodetic System 1984 (G2139)", ID["EPSG",1309]], MEMBER["World Geodetic System 1984 (G2296)", ID["EPSG",1383]], ELLIPSOID["WGS 84",6378137,298.257223563,LENGTHUNIT["metre",1,ID["EPSG",9001]],ID["EPSG",7030]], ENSEMBLEACCURACY[2],ID["EPSG",6326]],ID["EPSG",4326]],CONVERSION["UTM zone 28N",METHOD["Transverse Mercator",ID["EPSG",9807]],PARAMETER["Latitude of natural origin",0,ANGLEUNIT["degree",0.0174532925199433,ID["EPSG",9102]],ID["EPSG",8801]],PARAMETER["Longitude of natural origin",-15,ANGLEUNIT["degree",0.0174532925199433,ID["EPSG",9102]],ID["EPSG",8802]],PARAMETER["Scale factor at natural origin",0.9996,SCALEUNIT["unity",1,ID["EPSG",9201]],ID["EPSG",8805]],PARAMETER["False easting",500000,LENGTHUNIT["metre",1,ID["EPSG",9001]],ID["EPSG",8806]],PARAMETER["False northing",0,LENGTHUNIT["metre",1,ID["EPSG",9001]],ID["EPSG",8807]],ID["EPSG",16028]],CS[Cartesian,2,ID["EPSG",4400]],AXIS["Easting (E)",east],AXIS["Northing (N)",north],LENGTHUNIT["metre",1,ID["EPSG",9001]],ID["EPSG",32628]]',
    proj4: "+proj=utm +zone=28 +datum=WGS84 +units=m +no_defs +type=crs",
    bbox: [84, -18, 0, -12],
    unit: "metre",
    accuracy: null
  },
  '32629': {
    code: "32629",
    kind: "CRS-PROJCRS",
    name: "WGS 84 / UTM zone 29N",
    wkt: 'PROJCRS["WGS 84 / UTM zone 29N",BASEGEOGCRS["WGS 84",ENSEMBLE["World Geodetic System 1984 ensemble", MEMBER["World Geodetic System 1984 (Transit)", ID["EPSG",1166]], MEMBER["World Geodetic System 1984 (G730)", ID["EPSG",1152]], MEMBER["World Geodetic System 1984 (G873)", ID["EPSG",1153]], MEMBER["World Geodetic System 1984 (G1150)", ID["EPSG",1154]], MEMBER["World Geodetic System 1984 (G1674)", ID["EPSG",1155]], MEMBER["World Geodetic System 1984 (G1762)", ID["EPSG",1156]], MEMBER["World Geodetic System 1984 (G2139)", ID["EPSG",1309]], MEMBER["World Geodetic System 1984 (G2296)", ID["EPSG",1383]], ELLIPSOID["WGS 84",6378137,298.257223563,LENGTHUNIT["metre",1,ID["EPSG",9001]],ID["EPSG",7030]], ENSEMBLEACCURACY[2],ID["EPSG",6326]],ID["EPSG",4326]],CONVERSION["UTM zone 29N",METHOD["Transverse Mercator",ID["EPSG",9807]],PARAMETER["Latitude of natural origin",0,ANGLEUNIT["degree",0.0174532925199433,ID["EPSG",9102]],ID["EPSG",8801]],PARAMETER["Longitude of natural origin",-9,ANGLEUNIT["degree",0.0174532925199433,ID["EPSG",9102]],ID["EPSG",8802]],PARAMETER["Scale factor at natural origin",0.9996,SCALEUNIT["unity",1,ID["EPSG",9201]],ID["EPSG",8805]],PARAMETER["False easting",500000,LENGTHUNIT["metre",1,ID["EPSG",9001]],ID["EPSG",8806]],PARAMETER["False northing",0,LENGTHUNIT["metre",1,ID["EPSG",9001]],ID["EPSG",8807]],ID["EPSG",16029]],CS[Cartesian,2,ID["EPSG",4400]],AXIS["Easting (E)",east],AXIS["Northing (N)",north],LENGTHUNIT["metre",1,ID["EPSG",9001]],ID["EPSG",32629]]',
    proj4: "+proj=utm +zone=29 +datum=WGS84 +units=m +no_defs +type=crs",
    bbox: [84, -12, 0, -6],
    unit: "metre",
    accuracy: null
  },
  '32631': {
    code: "32631",
    kind: "CRS-PROJCRS",
    name: "WGS 84 / UTM zone 31N",
    wkt: 'PROJCRS["WGS 84 / UTM zone 31N",BASEGEOGCRS["WGS 84",ENSEMBLE["World Geodetic System 1984 ensemble", MEMBER["World Geodetic System 1984 (Transit)", ID["EPSG",1166]], MEMBER["World Geodetic System 1984 (G730)", ID["EPSG",1152]], MEMBER["World Geodetic System 1984 (G873)", ID["EPSG",1153]], MEMBER["World Geodetic System 1984 (G1150)", ID["EPSG",1154]], MEMBER["World Geodetic System 1984 (G1674)", ID["EPSG",1155]], MEMBER["World Geodetic System 1984 (G1762)", ID["EPSG",1156]], MEMBER["World Geodetic System 1984 (G2139)", ID["EPSG",1309]], MEMBER["World Geodetic System 1984 (G2296)", ID["EPSG",1383]], ELLIPSOID["WGS 84",6378137,298.257223563,LENGTHUNIT["metre",1,ID["EPSG",9001]],ID["EPSG",7030]], ENSEMBLEACCURACY[2],ID["EPSG",6326]],ID["EPSG",4326]],CONVERSION["UTM zone 31N",METHOD["Transverse Mercator",ID["EPSG",9807]],PARAMETER["Latitude of natural origin",0,ANGLEUNIT["degree",0.0174532925199433,ID["EPSG",9102]],ID["EPSG",8801]],PARAMETER["Longitude of natural origin",3,ANGLEUNIT["degree",0.0174532925199433,ID["EPSG",9102]],ID["EPSG",8802]],PARAMETER["Scale factor at natural origin",0.9996,SCALEUNIT["unity",1,ID["EPSG",9201]],ID["EPSG",8805]],PARAMETER["False easting",500000,LENGTHUNIT["metre",1,ID["EPSG",9001]],ID["EPSG",8806]],PARAMETER["False northing",0,LENGTHUNIT["metre",1,ID["EPSG",9001]],ID["EPSG",8807]],ID["EPSG",16031]],CS[Cartesian,2,ID["EPSG",4400]],AXIS["Easting (E)",east],AXIS["Northing (N)",north],LENGTHUNIT["metre",1,ID["EPSG",9001]],ID["EPSG",32631]]',
    proj4: "+proj=utm +zone=31 +datum=WGS84 +units=m +no_defs +type=crs",
    bbox: [84, 0, 0, 6],
    unit: "metre",
    accuracy: null
  },
  '4258': {
    code: "4258",
    kind: "CRS-GEOGCRS",
    name: "ETRS89",
    wkt: "GEOGCRS[\"ETRS89\",ENSEMBLE[\"European Terrestrial Reference System 1989 ensemble\", MEMBER[\"European Terrestrial Reference Frame 1989\", ID[\"EPSG\",1178]], MEMBER[\"European Terrestrial Reference Frame 1990\", ID[\"EPSG\",1179]], MEMBER[\"European Terrestrial Reference Frame 1991\", ID[\"EPSG\",1180]], MEMBER[\"European Terrestrial Reference Frame 1992\", ID[\"EPSG\",1181]], MEMBER[\"European Terrestrial Reference Frame 1993\", ID[\"EPSG\",1182]], MEMBER[\"European Terrestrial Reference Frame 1994\", ID[\"EPSG\",1183]], MEMBER[\"European Terrestrial Reference Frame 1996\", ID[\"EPSG\",1184]], MEMBER[\"European Terrestrial Reference Frame 1997\", ID[\"EPSG\",1185]], MEMBER[\"European Terrestrial Reference Frame 2000\", ID[\"EPSG\",1186]], MEMBER[\"European Terrestrial Reference Frame 2005\", ID[\"EPSG\",1204]], MEMBER[\"European Terrestrial Reference Frame 2014\", ID[\"EPSG\",1206]], MEMBER[\"European Terrestrial Reference Frame 2020\", ID[\"EPSG\",1382]], ELLIPSOID[\"GRS 1980\",6378137,298.257222101,LENGTHUNIT[\"metre\",1,ID[\"EPSG\",9001]],ID[\"EPSG\",7019]], ENSEMBLEACCURACY[0.1],ID[\"EPSG\",6258]],CS[ellipsoidal,2,ID[\"EPSG\",6422]],AXIS[\"Geodetic latitude (Lat)\",north],AXIS[\"Geodetic longitude (Lon)\",east],ANGLEUNIT[\"degree\",0.0174532925199433,ID[\"EPSG\",9102]],ID[\"EPSG\",4258]]",
    proj4: "+proj=longlat +ellps=GRS80 +no_defs +type=crs +axis=neu",
    bbox: [33.26, -16.1, 84.73, 38.01],
    unit: "degree",
    accuracy: null
  },
  '4230': {
    code: "4230",
    kind: "CRS-GEOGCRS",
    name: "ED50",
    wkt: 'GEOGCRS["ED50",DATUM["European Datum 1950",ELLIPSOID["International 1924",6378388,297,LENGTHUNIT["metre",1,ID["EPSG",9001]],ID["EPSG",7022]],ID["EPSG",6230]],CS[ellipsoidal,2,ID["EPSG",6422]],AXIS["Geodetic latitude (Lat)",north],AXIS["Geodetic longitude (Lon)",east],ANGLEUNIT["degree",0.0174532925199433,ID["EPSG",9102]],ID["EPSG",4230]]',
    proj4: "+proj=longlat +ellps=intl +towgs84=-87,-98,-121,0,0,0,0 +no_defs +type=crs +axis=neu",
    bbox: [84.73, -16.1, 25.71, 48.61],
    unit: "degree",
    accuracy: 10
  },
  '3040': {
    code: "3040",
    kind: "CRS-PROJCRS",
    name: "ETRS89 / UTM zone 28N (N-E)",
    wkt: 'PROJCRS["ETRS89 / UTM zone 28N (N-E)",BASEGEOGCRS["ETRS89",ENSEMBLE["European Terrestrial Reference System 1989 ensemble", MEMBER["European Terrestrial Reference Frame 1989", ID["EPSG",1178]], MEMBER["European Terrestrial Reference Frame 1990", ID["EPSG",1179]], MEMBER["European Terrestrial Reference Frame 1991", ID["EPSG",1180]], MEMBER["European Terrestrial Reference Frame 1992", ID["EPSG",1181]], MEMBER["European Terrestrial Reference Frame 1993", ID["EPSG",1182]], MEMBER["European Terrestrial Reference Frame 1994", ID["EPSG",1183]], MEMBER["European Terrestrial Reference Frame 1996", ID["EPSG",1184]], MEMBER["European Terrestrial Reference Frame 1997", ID["EPSG",1185]], MEMBER["European Terrestrial Reference Frame 2000", ID["EPSG",1186]], MEMBER["European Terrestrial Reference Frame 2005", ID["EPSG",1204]], MEMBER["European Terrestrial Reference Frame 2014", ID["EPSG",1206]], MEMBER["European Terrestrial Reference Frame 2020", ID["EPSG",1382]], ELLIPSOID["GRS 1980",6378137,298.257222101,LENGTHUNIT["metre",1,ID["EPSG",9001]],ID["EPSG",7019]], ENSEMBLEACCURACY[0.1],ID["EPSG",6258]],ID["EPSG",4258]],CONVERSION["UTM zone 28N",METHOD["Transverse Mercator",ID["EPSG",9807]],PARAMETER["Latitude of natural origin",0,ANGLEUNIT["degree",0.0174532925199433,ID["EPSG",9102]],ID["EPSG",8801]],PARAMETER["Longitude of natural origin",-15,ANGLEUNIT["degree",0.0174532925199433,ID["EPSG",9102]],ID["EPSG",8802]],PARAMETER["Scale factor at natural origin",0.9996,SCALEUNIT["unity",1,ID["EPSG",9201]],ID["EPSG",8805]],PARAMETER["False easting",500000,LENGTHUNIT["metre",1,ID["EPSG",9001]],ID["EPSG",8806]],PARAMETER["False northing",0,LENGTHUNIT["metre",1,ID["EPSG",9001]],ID["EPSG",8807]],ID["EPSG",16028]],CS[Cartesian,2,ID["EPSG",4500]],AXIS["Northing (N)",north],AXIS["Easting (E)",east],LENGTHUNIT["metre",1,ID["EPSG",9001]],ID["EPSG",3040]]',
    proj4: "+proj=utm +zone=28 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs +axis=neu",
    bbox: [72.44, -16.1, 34.93, -11.99],
    unit: "metre",
    accuracy: 1
  },
  '3041': {
    code: "3041",
    kind: "CRS-PROJCRS",
    name: "ETRS89 / UTM zone 29N (N-E)",
    wkt: 'PROJCRS["ETRS89 / UTM zone 29N (N-E)",BASEGEOGCRS["ETRS89",ENSEMBLE["European Terrestrial Reference System 1989 ensemble", MEMBER["European Terrestrial Reference Frame 1989", ID["EPSG",1178]], MEMBER["European Terrestrial Reference Frame 1990", ID["EPSG",1179]], MEMBER["European Terrestrial Reference Frame 1991", ID["EPSG",1180]], MEMBER["European Terrestrial Reference Frame 1992", ID["EPSG",1181]], MEMBER["European Terrestrial Reference Frame 1993", ID["EPSG",1182]], MEMBER["European Terrestrial Reference Frame 1994", ID["EPSG",1183]], MEMBER["European Terrestrial Reference Frame 1996", ID["EPSG",1184]], MEMBER["European Terrestrial Reference Frame 1997", ID["EPSG",1185]], MEMBER["European Terrestrial Reference Frame 2000", ID["EPSG",1186]], MEMBER["European Terrestrial Reference Frame 2005", ID["EPSG",1204]], MEMBER["European Terrestrial Reference Frame 2014", ID["EPSG",1206]], MEMBER["European Terrestrial Reference Frame 2020", ID["EPSG",1382]], ELLIPSOID["GRS 1980",6378137,298.257222101,LENGTHUNIT["metre",1,ID["EPSG",9001]],ID["EPSG",7019]], ENSEMBLEACCURACY[0.1],ID["EPSG",6258]],ID["EPSG",4258]],CONVERSION["UTM zone 29N",METHOD["Transverse Mercator",ID["EPSG",9807]],PARAMETER["Latitude of natural origin",0,ANGLEUNIT["degree",0.0174532925199433,ID["EPSG",9102]],ID["EPSG",8801]],PARAMETER["Longitude of natural origin",-9,ANGLEUNIT["degree",0.0174532925199433,ID["EPSG",9102]],ID["EPSG",8802]],PARAMETER["Scale factor at natural origin",0.9996,SCALEUNIT["unity",1,ID["EPSG",9201]],ID["EPSG",8805]],PARAMETER["False easting",500000,LENGTHUNIT["metre",1,ID["EPSG",9001]],ID["EPSG",8806]],PARAMETER["False northing",0,LENGTHUNIT["metre",1,ID["EPSG",9001]],ID["EPSG",8807]],ID["EPSG",16029]],CS[Cartesian,2,ID["EPSG",4500]],AXIS["Northing (N)",north],AXIS["Easting (E)",east],LENGTHUNIT["metre",1,ID["EPSG",9001]],ID["EPSG",3041]]',
    proj4: "+proj=utm +zone=29 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs +axis=neu",
    bbox: [74.13, -12, 34.91, -6],
    unit: "metre",
    accuracy: 1
  },
  '3042': {
    code: "3042",
    kind: "CRS-PROJCRS",
    name: "ETRS89 / UTM zone 30N (N-E)",
    wkt: 'PROJCRS["ETRS89 / UTM zone 30N (N-E)",BASEGEOGCRS["ETRS89",ENSEMBLE["European Terrestrial Reference System 1989 ensemble", MEMBER["European Terrestrial Reference Frame 1989", ID["EPSG",1178]], MEMBER["European Terrestrial Reference Frame 1990", ID["EPSG",1179]], MEMBER["European Terrestrial Reference Frame 1991", ID["EPSG",1180]], MEMBER["European Terrestrial Reference Frame 1992", ID["EPSG",1181]], MEMBER["European Terrestrial Reference Frame 1993", ID["EPSG",1182]], MEMBER["European Terrestrial Reference Frame 1994", ID["EPSG",1183]], MEMBER["European Terrestrial Reference Frame 1996", ID["EPSG",1184]], MEMBER["European Terrestrial Reference Frame 1997", ID["EPSG",1185]], MEMBER["European Terrestrial Reference Frame 2000", ID["EPSG",1186]], MEMBER["European Terrestrial Reference Frame 2005", ID["EPSG",1204]], MEMBER["European Terrestrial Reference Frame 2014", ID["EPSG",1206]], MEMBER["European Terrestrial Reference Frame 2020", ID["EPSG",1382]], ELLIPSOID["GRS 1980",6378137,298.257222101,LENGTHUNIT["metre",1,ID["EPSG",9001]],ID["EPSG",7019]], ENSEMBLEACCURACY[0.1],ID["EPSG",6258]],ID["EPSG",4258]],CONVERSION["UTM zone 30N",METHOD["Transverse Mercator",ID["EPSG",9807]],PARAMETER["Latitude of natural origin",0,ANGLEUNIT["degree",0.0174532925199433,ID["EPSG",9102]],ID["EPSG",8801]],PARAMETER["Longitude of natural origin",-3,ANGLEUNIT["degree",0.0174532925199433,ID["EPSG",9102]],ID["EPSG",8802]],PARAMETER["Scale factor at natural origin",0.9996,SCALEUNIT["unity",1,ID["EPSG",9201]],ID["EPSG",8805]],PARAMETER["False easting",500000,LENGTHUNIT["metre",1,ID["EPSG",9001]],ID["EPSG",8806]],PARAMETER["False northing",0,LENGTHUNIT["metre",1,ID["EPSG",9001]],ID["EPSG",8807]],ID["EPSG",16030]],CS[Cartesian,2,ID["EPSG",4500]],AXIS["Northing (N)",north],AXIS["Easting (E)",east],LENGTHUNIT["metre",1,ID["EPSG",9001]],ID["EPSG",3042]]',
    proj4: "+proj=utm +zone=30 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs +axis=neu",
    bbox: [80.49, -6, 35.26, 0.01],
    unit: "metre",
    accuracy: 1
  },
  '3043': {
    code: "3043",
    kind: "CRS-PROJCRS",
    name: "ETRS89 / UTM zone 31N (N-E)",
    wkt: 'PROJCRS["ETRS89 / UTM zone 31N (N-E)",BASEGEOGCRS["ETRS89",ENSEMBLE["European Terrestrial Reference System 1989 ensemble", MEMBER["European Terrestrial Reference Frame 1989", ID["EPSG",1178]], MEMBER["European Terrestrial Reference Frame 1990", ID["EPSG",1179]], MEMBER["European Terrestrial Reference Frame 1991", ID["EPSG",1180]], MEMBER["European Terrestrial Reference Frame 1992", ID["EPSG",1181]], MEMBER["European Terrestrial Reference Frame 1993", ID["EPSG",1182]], MEMBER["European Terrestrial Reference Frame 1994", ID["EPSG",1183]], MEMBER["European Terrestrial Reference Frame 1996", ID["EPSG",1184]], MEMBER["European Terrestrial Reference Frame 1997", ID["EPSG",1185]], MEMBER["European Terrestrial Reference Frame 2000", ID["EPSG",1186]], MEMBER["European Terrestrial Reference Frame 2005", ID["EPSG",1204]], MEMBER["European Terrestrial Reference Frame 2014", ID["EPSG",1206]], MEMBER["European Terrestrial Reference Frame 2020", ID["EPSG",1382]], ELLIPSOID["GRS 1980",6378137,298.257222101,LENGTHUNIT["metre",1,ID["EPSG",9001]],ID["EPSG",7019]], ENSEMBLEACCURACY[0.1],ID["EPSG",6258]],ID["EPSG",4258]],CONVERSION["UTM zone 31N",METHOD["Transverse Mercator",ID["EPSG",9807]],PARAMETER["Latitude of natural origin",0,ANGLEUNIT["degree",0.0174532925199433,ID["EPSG",9102]],ID["EPSG",8801]],PARAMETER["Longitude of natural origin",3,ANGLEUNIT["degree",0.0174532925199433,ID["EPSG",9102]],ID["EPSG",8802]],PARAMETER["Scale factor at natural origin",0.9996,SCALEUNIT["unity",1,ID["EPSG",9201]],ID["EPSG",8805]],PARAMETER["False easting",500000,LENGTHUNIT["metre",1,ID["EPSG",9001]],ID["EPSG",8806]],PARAMETER["False northing",0,LENGTHUNIT["metre",1,ID["EPSG",9001]],ID["EPSG",8807]],ID["EPSG",16031]],CS[Cartesian,2,ID["EPSG",4500]],AXIS["Northing (N)",north],AXIS["Easting (E)",east],LENGTHUNIT["metre",1,ID["EPSG",9001]],ID["EPSG",3043]]',
    proj4: "+proj=utm +zone=31 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs +axis=neu",
    bbox: [82.45, 0, 37, 6.01],
    unit: "metre",
    accuracy: 1
  },
};

// Initialize proj4 definitions for geographic projections (as-is from TC.js)
// This runs automatically when the module loads
(function initializeProj4FromCache() {
  try {
    // Try to import proj4 dynamically (it's a dependency of api-sitna)
    // Use dynamic import to avoid blocking module load
    import('proj4').then((proj4Module) => {
      const proj4 = proj4Module.default || proj4Module;

      for (const code of Object.keys(projectionDataCache)) {
        const obj = projectionDataCache[code];
        if (obj.proj4 && obj.proj4.includes('+proj=longlat')) {
          proj4.defs('EPSG:' + code, obj.wkt);
          const def = proj4.defs('EPSG:' + code);
          if (def) {
            (def as { units?: string }).units = 'degrees';
          }
        }
      }
    }).catch(() => {
      // Silent catch is intentional: This IIFE runs during module load (before Angular bootstraps),
      // so LoggingService is not available. proj4 might not be loaded yet or might be initialized
      // elsewhere in the application lifecycle. Errors here are non-critical.
    });
  } catch (error) {
    // Silent catch is intentional: This IIFE runs during module load (before Angular bootstraps),
    // so LoggingService is not available. proj4 might not be loaded yet. Errors here are non-critical.
  }
})();

// Backported getProjectionData function from TC.js (as-is)
// Note: For async mode, this wraps the result in EPSG API format { status: 'ok', number_result: 1, results: [...] }
// to maintain compatibility with loadProjections. For sync mode, it returns ProjectionData directly.
//
// IMPORTANT: Uses proj4 string as 'def' instead of WKT to avoid proj4js parsing errors.
// Issue: proj4js (JavaScript library) does not support the "up" axis direction in WKT definitions,
// which causes "Unknown axis direction: up" errors. While the PROJ library (C) supports this
// via the +axis parameter starting from version 4.8.0 (see https://proj.org/en/stable/usage/projections.html),
// proj4js does not have feature parity and cannot parse WKT with "up" axis directions.
// Therefore, we use the proj4 string format which proj4js can handle correctly.
// Reference: SITNA API 4.1.0 uses WKT in the 'def' field, but this causes errors with proj4js 2.8.0+.
export function getProjectionData(options: GetProjectionDataOptions = {}): ProjectionData | Promise<ProjectionData | false | { status: string; number_result: number; results: Array<{ code: string; name: string; def: string; proj4: string; unit: string | null }> }> {
  const TC = (window as { TC?: TCNamespace }).TC || (globalThis as { TC?: TCNamespace }).TC;
  if (!TC) {
    throw new Error('TC namespace not available');
  }

  // Use TC.projectionDataCache if available (patched), otherwise use local cache
  const cache = (TC.projectionDataCache || projectionDataCache) as Record<string, ProjectionData>;

  const crs = options.crs || '';
  const match = crs.match(/\d{4,6}$/g);
  let code = match ? match[0] : '';
  let projData = cache[code];
  if (projData) {
    if (options.sync) {
      return projData;
    }
    // For async mode, wrap in EPSG API format for compatibility with loadProjections
    // Use proj4 string as 'def' instead of WKT (see comment above for explanation)
    return Promise.resolve({
      status: 'ok',
      number_result: 1,
      results: [{
        code: projData.code,
        name: projData.name,
        def: projData.proj4, // Use proj4 string instead of WKT to avoid "Unknown axis direction: up" errors
        proj4: projData.proj4,
        unit: projData.unit || null
      }]
    });
  }

  if (options.sync) {
    const request = function (url: string): string | false {
      let result: string | false = false;
      const xhr = new XMLHttpRequest();
      xhr.onreadystatechange = function (_e) {
        if (xhr.readyState === 4) {
          if (xhr.status === 404) {
            result = false;
          } else if (xhr.status !== 200) {
            result = false;
          } else {
            result = xhr.responseText;
          }
        }
      };
      xhr.open('GET', url, false);

      try {
        xhr.send(null);
      } catch (error) {
        result = false;
      }
      return result;
    };

    // Buscamos la definición del código EPSG en el archivo JSON agregado por sus 3 últimos dígitos.
    const jsonObj = JSON.parse(request(`${TC.apiLocation}resources/data/crs/${code.substring(code.length - 3)}.json`) || '{}');
    cache[code] = jsonObj[code];
    return jsonObj[code];
  }
  // Buscamos la definición del código EPSG en el archivo JSON agregado por sus 3 últimos dígitos.
  return fetch(`${TC.apiLocation}resources/data/crs/${code.substring(code.length - 3)}.json`)
    .then((response) => {
      return response
        .json()
        .then((json: Record<string, ProjectionData>) => {
          const data = json[code];
          if (data) {
            cache[code] = data;
            // Wrap in EPSG API format for compatibility with loadProjections
            // Use proj4 string as 'def' instead of WKT (see comment above for explanation)
            return {
              status: 'ok',
              number_result: 1,
              results: [{
                code: data.code,
                name: data.name,
                def: data.proj4, // Use proj4 string instead of WKT to avoid "Unknown axis direction: up" errors
                proj4: data.proj4,
                unit: data.unit || null
              }]
            };
          }
          return false;
        })
        .catch((): false => false);
    })
    .catch((): false => false);
}

// Initialize proj4 definitions for geographic projections (as-is from TC.js)
export async function initializeProj4Definitions(
  cache: Record<string, ProjectionData>,
  logger?: { warn: (message: string, ...args: unknown[]) => void; error: (message: string, ...args: unknown[]) => void }
): Promise<void> {
  try {
    // Try to import proj4 dynamically (it's a dependency of api-sitna)
    const proj4Module = await import('proj4');
    const proj4 = proj4Module.default || proj4Module;

    for (const code of Object.keys(cache)) {
      const obj = cache[code];
      if (obj.proj4 && obj.proj4.includes('+proj=longlat')) {
        proj4.defs('EPSG:' + code, obj.wkt);
        const def = proj4.defs('EPSG:' + code);
        if (def) {
          (def as { units?: string }).units = 'degrees';
        }
      }
    }
    logger?.warn('Initialized proj4 definitions for geographic projections');
  } catch (error) {
    logger?.error('Failed to initialize proj4 definitions', error);
    // Continue anyway - proj4 might be initialized elsewhere
  }
}

