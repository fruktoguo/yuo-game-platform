export type GSS0StatusId = "frost" | "burn" | "corrosion";

export interface GSS0StatusCatalogEntry {
  readonly id: GSS0StatusId;
  readonly name: string;
  readonly color: string;
  readonly desc: string;
}

declare global {
  var GSS0StatusCatalog: readonly GSS0StatusCatalogEntry[];
  var GSS0DescribeStatus: (statusId: GSS0StatusId, balance?: Record<string, unknown>) => string;
}
