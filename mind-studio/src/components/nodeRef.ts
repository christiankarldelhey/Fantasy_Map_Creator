/** Which node of the wiring is in focus — shared by the graph, the Lens
 *  list and the detail card so hovering one lights the others. */
export interface NodeRef {
  kind: 'memory' | 'belief' | 'need'
  id: string
}
