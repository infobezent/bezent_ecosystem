/**
 * BEZENT Common Data Engine - Normalization Contracts
 */

export interface TextNormalizationOptions {
  /**
   * If true, collapses consecutive whitespace characters (e.g. multiple spaces, tabs)
   * into a single standard space.
   */
  readonly collapseWhitespace?: boolean;
  /**
   * If true (default), trims leading and trailing whitespace.
   */
  readonly trim?: boolean;
}

export interface IdentifierNormalizationOptions {
  /**
   * If true (default), converts the identifier to uppercase.
   */
  readonly uppercase?: boolean;
  /**
   * Character to replace spaces or unallowed characters with (e.g. '-').
   */
  readonly replacementChar?: string;
}
