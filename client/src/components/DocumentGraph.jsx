import React, { useMemo, useState } from 'react';
import { 
  Network, FileText, ArrowRight, Filter, 
  ZoomIn, ZoomOut, Maximize2, Info
} from 'lucide-react';

/**
 * DocumentGraph Component
 * 
 * Visualizes document and concept relationships as an interactive graph.
 * Uses a simple force-directed layout simulation.
 */
const DocumentGraph = ({ relationships, concepts = [] }) => {
  const [selectedNode, setSelectedNode] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [zoom, setZoom] = useState(1);

  // Process relationships into nodes and edges
  const { nodes, edges } = useMemo(() => {
    const nodeMap = new Map();
    const edgeList = [];
    
    // Add nodes from relationships
    relationships.forEach((rel, idx) => {
      // Source node
      if (!nodeMap.has(rel.source)) {
        nodeMap.set(rel.source, {
          id: rel.source,
          label: rel.source,
          type: 'concept',
          connections: 0,
          x: 0,
          y: 0
        });
      }
      nodeMap.get(rel.source).connections++;
      
      // Target node
      if (!nodeMap.has(rel.target)) {
        nodeMap.set(rel.target, {
          id: rel.target,
          label: rel.target,
          type: 'concept',
          connections: 0,
          x: 0,
          y: 0
        });
      }
      nodeMap.get(rel.target).connections++;
      
      // Edge
      edgeList.push({
        id: `edge-${idx}`,
        source: rel.source,
        target: rel.target,
        type: rel.type,
        strength: rel.strength,
        evidence: rel.evidence || []
      });
    });
    
    // Position nodes in a circle with some jitter
    const nodeArray = Array.from(nodeMap.values());
    const centerX = 300;
    const centerY = 250;
    const radius = Math.min(200, 80 + nodeArray.length * 15);
    
    nodeArray.forEach((node, idx) => {
      const angle = (2 * Math.PI * idx) / nodeArray.length;
      const jitter = (Math.random() - 0.5) * 30;
      node.x = centerX + radius * Math.cos(angle) + jitter;
      node.y = centerY + radius * Math.sin(angle) + jitter;
    });
    
    return { nodes: nodeArray, edges: edgeList };
  }, [relationships]);

  // Filter edges by type
  const filteredEdges = useMemo(() => {
    if (filterType === 'all') return edges;
    return edges.filter(e => e.type === filterType);
  }, [edges, filterType]);

  // Get unique relationship types
  const relationshipTypes = useMemo(() => {
    return [...new Set(edges.map(e => e.type))];
  }, [edges]);

  const getRelationshipColor = (type) => {
    const colors = {
      'causes': '#ef4444',
      'supports': '#22c55e',
      'contradicts': '#f59e0b',
      'relates-to': '#3b82f6',
      'similar-to': '#8b5cf6',
      'depends-on': '#ec4899',
      'leads-to': '#14b8a6',
      'part-of': '#f97316'
    };
    return colors[type] || '#6b7280';
  };

  const getNodeSize = (connections) => {
    return Math.min(50, Math.max(30, 20 + connections * 5));
  };

  if (relationships.length === 0) {
    return (
      <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-light)] p-8 text-center">
        <Network className="w-12 h-12 mx-auto text-[var(--text-tertiary)] mb-3" />
        <p className="text-[var(--text-secondary)]">No relationships found</p>
        <p className="text-sm text-[var(--text-tertiary)] mt-1">
          Relationships are discovered during deep search analysis
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header & Controls */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Network className="w-5 h-5 text-[var(--accent-primary)]" />
          <h2 className="text-lg font-semibold">Document Relationships</h2>
          <span className="text-sm text-[var(--text-tertiary)]">
            ({nodes.length} concepts, {edges.length} relationships)
          </span>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[var(--text-secondary)]" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="text-sm bg-[var(--bg-primary)] border border-[var(--border-light)] rounded-lg px-2 py-1"
            >
              <option value="all">All Types</option>
              {relationshipTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          
          {/* Zoom */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}
              className="p-1 hover:bg-[var(--bg-hover)] rounded"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-sm w-12 text-center">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setZoom(z => Math.min(2, z + 0.1))}
              className="p-1 hover:bg-[var(--bg-hover)] rounded"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoom(1)}
              className="p-1 hover:bg-[var(--bg-hover)] rounded"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Graph Visualization */}
        <div className="lg:col-span-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-light)] overflow-hidden">
          <svg 
            viewBox="0 0 600 500" 
            className="w-full h-[500px]"
            style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
          >
            {/* Background grid */}
            <defs>
              <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                <path 
                  d="M 50 0 L 0 0 0 50" 
                  fill="none" 
                  stroke="var(--border-light)" 
                  strokeWidth="0.5"
                  opacity="0.3"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />

            {/* Edges */}
            {filteredEdges.map((edge) => {
              const sourceNode = nodes.find(n => n.id === edge.source);
              const targetNode = nodes.find(n => n.id === edge.target);
              if (!sourceNode || !targetNode) return null;
              
              const color = getRelationshipColor(edge.type);
              const isSelected = selectedNode === edge.source || selectedNode === edge.target;
              
              return (
                <g key={edge.id}>
                  {/* Edge line */}
                  <line
                    x1={sourceNode.x}
                    y1={sourceNode.y}
                    x2={targetNode.x}
                    y2={targetNode.y}
                    stroke={color}
                    strokeWidth={isSelected ? 3 : 1.5}
                    strokeOpacity={isSelected ? 1 : 0.6}
                    strokeDasharray={edge.type === 'contradicts' ? '5,5' : 'none'}
                  />
                  
                  {/* Arrow marker */}
                  <polygon
                    points={calculateArrowPoints(sourceNode, targetNode)}
                    fill={color}
                    opacity={isSelected ? 1 : 0.6}
                  />
                  
                  {/* Edge label */}
                  <text
                    x={(sourceNode.x + targetNode.x) / 2}
                    y={(sourceNode.y + targetNode.y) / 2 - 8}
                    textAnchor="middle"
                    fontSize="10"
                    fill="var(--text-secondary)"
                    className="pointer-events-none"
                  >
                    {edge.type}
                  </text>
                </g>
              );
            })}

            {/* Nodes */}
            {nodes.map((node) => {
              const size = getNodeSize(node.connections);
              const isSelected = selectedNode === node.id;
              
              return (
                <g 
                  key={node.id}
                  onClick={() => setSelectedNode(isSelected ? null : node.id)}
                  className="cursor-pointer"
                >
                  {/* Node circle */}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={size / 2}
                    fill={isSelected ? 'var(--accent-primary)' : 'var(--bg-primary)'}
                    stroke={isSelected ? 'var(--accent-primary)' : 'var(--border-light)'}
                    strokeWidth={isSelected ? 3 : 2}
                    className="transition-all duration-200"
                  />
                  
                  {/* Node label */}
                  <text
                    x={node.x}
                    y={node.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="11"
                    fontWeight="500"
                    fill={isSelected ? 'white' : 'var(--text-primary)'}
                    className="pointer-events-none"
                  >
                    {truncateLabel(node.label, 10)}
                  </text>
                  
                  {/* Connection count badge */}
                  <circle
                    cx={node.x + size / 2 - 5}
                    cy={node.y - size / 2 + 5}
                    r="8"
                    fill="var(--accent-primary)"
                  />
                  <text
                    x={node.x + size / 2 - 5}
                    y={node.y - size / 2 + 5}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="9"
                    fill="white"
                    className="pointer-events-none"
                  >
                    {node.connections}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Legend */}
          <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-light)] p-4">
            <h3 className="text-sm font-semibold mb-3">Relationship Types</h3>
            <div className="space-y-2">
              {relationshipTypes.map(type => (
                <div 
                  key={type}
                  className={`flex items-center gap-2 text-sm cursor-pointer p-1 rounded transition-colors ${
                    filterType === type ? 'bg-[var(--bg-hover)]' : ''
                  }`}
                  onClick={() => setFilterType(filterType === type ? 'all' : type)}
                >
                  <span 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: getRelationshipColor(type) }}
                  />
                  <span className="capitalize">{type}</span>
                  <span className="ml-auto text-xs text-[var(--text-tertiary)]">
                    {edges.filter(e => e.type === type).length}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Selected Node Info */}
          {selectedNode && (
            <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-light)] p-4">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Info className="w-4 h-4" />
                Selected: {selectedNode}
              </h3>
              <div className="space-y-3">
                {/* Outgoing relationships */}
                <div>
                  <span className="text-xs text-[var(--text-tertiary)]">Outgoing</span>
                  <div className="space-y-1 mt-1">
                    {edges
                      .filter(e => e.source === selectedNode)
                      .map((e, i) => (
                        <div 
                          key={i}
                          className="flex items-center gap-2 text-sm p-1 bg-[var(--bg-primary)] rounded"
                        >
                          <ArrowRight 
                            className="w-3 h-3 flex-shrink-0"
                            style={{ color: getRelationshipColor(e.type) }}
                          />
                          <span className="truncate">{e.target}</span>
                        </div>
                      ))}
                    {edges.filter(e => e.source === selectedNode).length === 0 && (
                      <span className="text-xs text-[var(--text-tertiary)]">None</span>
                    )}
                  </div>
                </div>
                
                {/* Incoming relationships */}
                <div>
                  <span className="text-xs text-[var(--text-tertiary)]">Incoming</span>
                  <div className="space-y-1 mt-1">
                    {edges
                      .filter(e => e.target === selectedNode)
                      .map((e, i) => (
                        <div 
                          key={i}
                          className="flex items-center gap-2 text-sm p-1 bg-[var(--bg-primary)] rounded"
                        >
                          <ArrowRight 
                            className="w-3 h-3 flex-shrink-0 rotate-180"
                            style={{ color: getRelationshipColor(e.type) }}
                          />
                          <span className="truncate">{e.source}</span>
                        </div>
                      ))}
                    {edges.filter(e => e.target === selectedNode).length === 0 && (
                      <span className="text-xs text-[var(--text-tertiary)]">None</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Concepts List */}
          {concepts.length > 0 && (
            <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-light)] p-4">
              <h3 className="text-sm font-semibold mb-3">Key Concepts</h3>
              <div className="flex flex-wrap gap-1">
                {concepts.slice(0, 12).map((concept, idx) => (
                  <span 
                    key={idx}
                    className={`px-2 py-0.5 text-xs rounded cursor-pointer transition-colors ${
                      selectedNode === concept 
                        ? 'bg-[var(--accent-primary)] text-white'
                        : 'bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                    }`}
                    onClick={() => setSelectedNode(selectedNode === concept ? null : concept)}
                  >
                    {concept}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper function to calculate arrow points
function calculateArrowPoints(source, target) {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const angle = Math.atan2(dy, dx);
  
  const targetRadius = 20; // Approximate node radius
  const arrowLength = 10;
  
  const endX = target.x - targetRadius * Math.cos(angle);
  const endY = target.y - targetRadius * Math.sin(angle);
  
  const point1X = endX - arrowLength * Math.cos(angle - Math.PI / 6);
  const point1Y = endY - arrowLength * Math.sin(angle - Math.PI / 6);
  const point2X = endX - arrowLength * Math.cos(angle + Math.PI / 6);
  const point2Y = endY - arrowLength * Math.sin(angle + Math.PI / 6);
  
  return `${endX},${endY} ${point1X},${point1Y} ${point2X},${point2Y}`;
}

// Helper function to truncate labels
function truncateLabel(label, maxLength) {
  if (!label) return '';
  if (label.length <= maxLength) return label;
  return label.slice(0, maxLength - 2) + '...';
}

export default DocumentGraph;
