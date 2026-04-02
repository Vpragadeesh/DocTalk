import React, { useState } from 'react';
import { 
  Brain, ChevronDown, ChevronRight, CheckCircle, 
  AlertCircle, HelpCircle, FileText, Quote
} from 'lucide-react';

/**
 * ReasoningViewer Component
 * 
 * Displays chain-of-thought reasoning steps with expandable details,
 * confidence indicators, and source citations.
 */
const ReasoningViewer = ({ steps }) => {
  const [expandedSteps, setExpandedSteps] = useState(new Set([0])); // First step expanded by default
  const [showAllDetails, setShowAllDetails] = useState(false);

  if (!steps || steps.length === 0) {
    return (
      <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-light)] p-8 text-center">
        <Brain className="w-12 h-12 mx-auto text-[var(--text-tertiary)] mb-3" />
        <p className="text-[var(--text-secondary)]">No reasoning steps available</p>
      </div>
    );
  }

  const toggleStep = (index) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedSteps(newExpanded);
  };

  const toggleAll = () => {
    if (showAllDetails) {
      setExpandedSteps(new Set([0]));
    } else {
      setExpandedSteps(new Set(steps.map((_, i) => i)));
    }
    setShowAllDetails(!showAllDetails);
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.7) return 'text-green-500';
    if (confidence >= 0.4) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getConfidenceBgColor = (confidence) => {
    if (confidence >= 0.7) return 'bg-green-500/10 border-green-500/30';
    if (confidence >= 0.4) return 'bg-yellow-500/10 border-yellow-500/30';
    return 'bg-red-500/10 border-red-500/30';
  };

  const getConfidenceIcon = (confidence) => {
    if (confidence >= 0.7) return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (confidence >= 0.4) return <HelpCircle className="w-4 h-4 text-yellow-500" />;
    return <AlertCircle className="w-4 h-4 text-red-500" />;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-[var(--accent-primary)]" />
          <h2 className="text-lg font-semibold">Reasoning Chain</h2>
          <span className="text-sm text-[var(--text-tertiary)]">
            ({steps.length} steps)
          </span>
        </div>
        <button
          onClick={toggleAll}
          className="text-sm text-[var(--accent-primary)] hover:underline"
        >
          {showAllDetails ? 'Collapse All' : 'Expand All'}
        </button>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-[var(--border-light)]" />

        {/* Steps */}
        <div className="space-y-4">
          {steps.map((step, index) => {
            const isExpanded = expandedSteps.has(index);
            const isLastStep = index === steps.length - 1;
            
            return (
              <div key={index} className="relative pl-10">
                {/* Step marker */}
                <div 
                  className={`absolute left-0 top-4 w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                    isLastStep 
                      ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)] text-white'
                      : 'bg-[var(--bg-secondary)] border-[var(--border-light)] text-[var(--text-secondary)]'
                  }`}
                >
                  <span className="text-sm font-medium">{step.step}</span>
                </div>

                {/* Step content */}
                <div 
                  className={`bg-[var(--bg-secondary)] rounded-xl border transition-all ${
                    isExpanded 
                      ? 'border-[var(--accent-primary)]/50' 
                      : 'border-[var(--border-light)]'
                  }`}
                >
                  {/* Step header */}
                  <button
                    onClick={() => toggleStep(index)}
                    className="w-full p-4 flex items-start gap-3 text-left"
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-[var(--text-secondary)]" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-[var(--text-secondary)]" />
                      )}
                    </div>
                    
                    <div className="flex-grow min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
                          {isLastStep ? 'Final Synthesis' : `Step ${step.step}`}
                        </span>
                        {step.confidence !== undefined && (
                          <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${getConfidenceBgColor(step.confidence)}`}>
                            {getConfidenceIcon(step.confidence)}
                            <span className={getConfidenceColor(step.confidence)}>
                              {Math.round(step.confidence * 100)}%
                            </span>
                          </div>
                        )}
                      </div>
                      <h3 className="font-medium text-[var(--text-primary)] line-clamp-2">
                        {step.question}
                      </h3>
                    </div>
                  </button>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pl-12 space-y-4">
                      {/* Answer */}
                      <div className="p-4 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-light)]">
                        <div className="flex items-center gap-2 mb-2 text-sm text-[var(--text-secondary)]">
                          <Quote className="w-4 h-4" />
                          <span>Answer</span>
                        </div>
                        <p className="text-[var(--text-primary)] whitespace-pre-wrap">
                          {step.answer}
                        </p>
                      </div>

                      {/* Sources */}
                      {step.sources && step.sources.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-2 text-sm text-[var(--text-secondary)]">
                            <FileText className="w-4 h-4" />
                            <span>Sources</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {step.sources.map((source, sIdx) => (
                              <span 
                                key={sIdx}
                                className="px-2 py-1 text-xs bg-[var(--bg-primary)] border border-[var(--border-light)] rounded"
                              >
                                {typeof source === 'string' ? source : source.filename || 'Document'}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary */}
      <div className="mt-6 p-4 bg-[var(--accent-primary)]/5 rounded-xl border border-[var(--accent-primary)]/20">
        <div className="flex items-center gap-2 mb-2">
          <Brain className="w-5 h-5 text-[var(--accent-primary)]" />
          <span className="font-medium text-[var(--accent-primary)]">Reasoning Summary</span>
        </div>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-[var(--text-secondary)]">Total Steps</span>
            <p className="font-medium text-lg">{steps.length}</p>
          </div>
          <div>
            <span className="text-[var(--text-secondary)]">Avg. Confidence</span>
            <p className={`font-medium text-lg ${getConfidenceColor(
              steps.reduce((sum, s) => sum + (s.confidence || 0), 0) / steps.length
            )}`}>
              {Math.round(
                (steps.reduce((sum, s) => sum + (s.confidence || 0), 0) / steps.length) * 100
              )}%
            </p>
          </div>
          <div>
            <span className="text-[var(--text-secondary)]">Sources Referenced</span>
            <p className="font-medium text-lg">
              {new Set(steps.flatMap(s => s.sources || [])).size}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReasoningViewer;
