import React, { useState } from 'react';
import { 
  Calculator as CalcIcon, 
  Copy, 
  Check, 
  Sparkles, 
  ShieldCheck,
  TrendingUp,
  FileCheck2
} from 'lucide-react';
import { formatINR } from '../utils/calculations';
import { numberToWords } from '../utils/numberToWords';

export default function Calculator({ calculation, title = "Live GST & Total Calculator" }) {
  if (!calculation) return null;

  const [copied, setCopied] = useState(false);
  const words = numberToWords(calculation.finalTotal);

  const handleCopyTotal = () => {
    navigator.clipboard.writeText(calculation.finalTotal.toString());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="live-calculator-panel no-print">
      {/* Header */}
      <div className="calculator-header">
        <div className="calc-title-box">
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            background: 'var(--gold-500)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <CalcIcon size={16} />
          </div>
          <div>
            <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: '#ffffff', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              {title}
            </h4>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
              Automated recalculation on value, percentage, or quantity change
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <span className="calc-pulse-chip">
            <span className="status-dot"></span>
            <span>Live Calculation</span>
          </span>
          <button
            onClick={handleCopyTotal}
            className="btn btn-secondary"
            style={{
              padding: '0.35rem 0.65rem',
              fontSize: '0.74rem',
              background: 'rgba(255, 255, 255, 0.08)',
              borderColor: 'rgba(255, 255, 255, 0.15)',
              color: '#ffffff'
            }}
            title="Copy Final Total"
          >
            {copied ? <Check size={13} color="#34d399" /> : <Copy size={13} />}
            <span>{copied ? 'Copied!' : 'Copy Total'}</span>
          </button>
        </div>
      </div>

      {/* Financial Metrics Grid */}
      <div className="calc-grid">
        <div className="calc-item">
          <span className="calc-label">Taxable Amount (Base)</span>
          <span className="calc-value font-mono">₹ {formatINR(calculation.taxableAmount)}</span>
        </div>

        <div className="calc-item">
          <span className="calc-label">CGST ({calculation.cgstRate}%)</span>
          <span className="calc-value font-mono" style={{ color: '#93c5fd' }}>
            ₹ {formatINR(calculation.cgstAmount)}
          </span>
        </div>

        <div className="calc-item">
          <span className="calc-label">SGST ({calculation.sgstRate}%)</span>
          <span className="calc-value font-mono" style={{ color: '#93c5fd' }}>
            ₹ {formatINR(calculation.sgstAmount)}
          </span>
        </div>

        <div className="calc-item">
          <span className="calc-label">Subtotal (Base + GST)</span>
          <span className="calc-value font-mono">₹ {formatINR(calculation.subtotal)}</span>
        </div>

        <div className="calc-item">
          <span className="calc-label">Round-Off Adjustment</span>
          <span 
            className="calc-value font-mono" 
            style={{ color: calculation.roundOff < 0 ? '#f87171' : calculation.roundOff > 0 ? '#34d399' : '#94a3b8' }}
          >
            {calculation.roundOff < 0 
              ? `- ₹ ${Math.abs(calculation.roundOff).toFixed(2)}` 
              : calculation.roundOff > 0 
                ? `+ ₹ ${calculation.roundOff.toFixed(2)}` 
                : '₹ 0.00'}
          </span>
        </div>

        {/* Highlighted Final Payable Card */}
        <div className="calc-item highlight">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="calc-label" style={{ margin: 0 }}>Final Total Payable (INR)</span>
            <span style={{ fontSize: '0.65rem', padding: '0.15rem 0.45rem', background: 'rgba(251, 191, 36, 0.25)', color: '#fef08a', borderRadius: '4px', fontWeight: 700 }}>
              GST INCLUDED
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem', marginTop: '0.35rem' }}>
            <span style={{ fontSize: '1.1rem', color: '#fbbf24', fontWeight: 700 }}>₹</span>
            <span className="calc-value font-mono" style={{ fontSize: '1.65rem' }}>
              {formatINR(calculation.finalTotal)}
            </span>
          </div>
        </div>
      </div>

      {/* Amount in Words */}
      <div className="calc-words-box">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FileCheck2 size={16} color="#fbbf24" style={{ flexShrink: 0 }} />
          <div>
            <span style={{ color: '#94a3b8', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>
              Invoice Amount in Words:
            </span>
            <span>"{words}"</span>
          </div>
        </div>
      </div>
    </div>
  );
}
