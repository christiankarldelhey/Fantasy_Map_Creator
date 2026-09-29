// ============================================================================
// Map adapter
// ----------------------------------------------------------------------------
// Story's only door into the Map domain. Nothing outside this file should
// import from `domains/map/services/*` directly. Only climate math crosses
// this seam — aggregation helpers for the day→events translator.
// ============================================================================

export { innerClimate, meanOf, sumOf } from '../../map/services/data/climateData.js';
