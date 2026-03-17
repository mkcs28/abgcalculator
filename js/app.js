/* =========================================
   ABG Analyzer — app.js
   ========================================= */

'use strict';

// ─── Utilities ────────────────────────────
const $ = id => document.getElementById(id);
const n = v => parseFloat(v) || 0;

// ─── SVG Icon helpers ─────────────────────
function iconCheck() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>`;
}
function iconWarn() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>`;
}
function iconX() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>`;
}
function iconTrend() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>`;
}

function statusIcon(severity) {
  return `<span class="status-icon ${severity}">${severity === 'normal' ? iconCheck() : severity === 'abnormal' ? iconWarn() : iconX()}</span>`;
}

function badge(severity, text) {
  return `<span class="badge badge-${severity}">${text}</span>`;
}

// ─── Assessment Functions ─────────────────

function assessPH(v)     {
  if (v < 7.2)  return { status:'critical',  label:'Severe acidemia' };
  if (v < 7.35) return { status:'abnormal',  label:'Acidemia' };
  if (v > 7.55) return { status:'critical',  label:'Severe alkalemia' };
  if (v > 7.45) return { status:'abnormal',  label:'Alkalemia' };
  return { status:'normal', label:'Normal' };
}
function assessPCO2(v)   {
  if (v < 20)  return { status:'critical',  label:'Severe hypocapnia' };
  if (v < 35)  return { status:'abnormal',  label:'Hypocapnia' };
  if (v > 60)  return { status:'critical',  label:'Severe hypercapnia' };
  if (v > 45)  return { status:'abnormal',  label:'Hypercapnia' };
  return { status:'normal', label:'Normal' };
}
function assessHCO3(v)   {
  if (v < 15)  return { status:'critical',  label:'Severely low' };
  if (v < 22)  return { status:'abnormal',  label:'Low' };
  if (v > 30)  return { status:'critical',  label:'Severely elevated' };
  if (v > 26)  return { status:'abnormal',  label:'Elevated' };
  return { status:'normal', label:'Normal' };
}
function assessPO2(v)    {
  if (v < 40)  return { status:'critical',  label:'Severe hypoxemia' };
  if (v < 60)  return { status:'critical',  label:'Hypoxemia' };
  if (v < 80)  return { status:'abnormal',  label:'Mild hypoxemia' };
  if (v > 120) return { status:'abnormal',  label:'Hyperoxia' };
  return { status:'normal', label:'Normal' };
}

function primaryDisorder(ph, pco2, hco3) {
  if (ph < 7.35) {
    if (pco2 > 45 && hco3 < 22) return 'Mixed respiratory and metabolic acidosis';
    if (pco2 > 45)  return 'Respiratory acidosis';
    if (hco3 < 22)  return 'Metabolic acidosis';
    return 'Acidemia (unclassified)';
  }
  if (ph > 7.45) {
    if (pco2 < 35 && hco3 > 26) return 'Mixed respiratory and metabolic alkalosis';
    if (pco2 < 35)  return 'Respiratory alkalosis';
    if (hco3 > 26)  return 'Metabolic alkalosis';
    return 'Alkalemia (unclassified)';
  }
  if (pco2 > 45 && hco3 > 26) return 'Compensated respiratory acidosis';
  if (pco2 < 35 && hco3 < 22) return 'Compensated respiratory alkalosis';
  if (hco3 < 22 && pco2 < 35) return 'Compensated metabolic acidosis';
  if (hco3 > 26 && pco2 > 45) return 'Compensated metabolic alkalosis';
  return 'Normal acid-base status';
}

function severityOfDisorder(ph, pco2, hco3) {
  const phA = assessPH(ph);
  return phA.status;
}

function compensationDetail(ph, pco2, hco3) {
  if (ph < 7.35 && hco3 < 22) {
    const exp = 1.5 * hco3 + 8;
    if (Math.abs(pco2 - exp) <= 2) return { status:'Appropriate compensation', detail:`Expected PCO2: ${exp.toFixed(1)} ± 2 (Winters'). Actual: ${pco2}` };
    if (pco2 > exp + 2) return { status:'Concurrent respiratory acidosis', detail:`Expected PCO2: ${exp.toFixed(1)} ± 2. Actual PCO2 ${pco2} is higher → additional respiratory acidosis` };
    return { status:'Concurrent respiratory alkalosis', detail:`Expected PCO2: ${exp.toFixed(1)} ± 2. Actual PCO2 ${pco2} is lower → additional respiratory alkalosis` };
  }
  if (ph > 7.45 && hco3 > 26) {
    const exp = 0.7 * hco3 + 21;
    if (Math.abs(pco2 - exp) <= 2) return { status:'Appropriate compensation', detail:`Expected PCO2: ${exp.toFixed(1)} ± 2. Actual: ${pco2}` };
    if (pco2 > exp + 2) return { status:'Concurrent respiratory acidosis', detail:`Expected PCO2: ${exp.toFixed(1)} ± 2. Actual ${pco2} is higher` };
    return { status:'Concurrent respiratory alkalosis', detail:`Expected PCO2: ${exp.toFixed(1)} ± 2. Actual ${pco2} is lower` };
  }
  if (pco2 > 45) {
    const acute = 24 + 1 * ((pco2 - 40) / 10);
    const chronic = 24 + 3.5 * ((pco2 - 40) / 10);
    if (hco3 <= acute + 2) return { status:'Acute (uncompensated)', detail:`Expected HCO3 acute: ${acute.toFixed(1)}, chronic: ${chronic.toFixed(1)}. Pattern suggests acute.` };
    if (hco3 >= chronic - 2) return { status:'Chronic (compensated)', detail:`Expected HCO3 acute: ${acute.toFixed(1)}, chronic: ${chronic.toFixed(1)}. Pattern suggests chronic.` };
    return { status:'Partially compensated', detail:`Expected HCO3 acute: ${acute.toFixed(1)}, chronic: ${chronic.toFixed(1)}. Intermediate value.` };
  }
  if (pco2 < 35) {
    const acute = 24 - 2 * ((40 - pco2) / 10);
    const chronic = 24 - 5 * ((40 - pco2) / 10);
    if (hco3 >= acute - 2) return { status:'Acute (uncompensated)', detail:`Expected HCO3 acute: ${acute.toFixed(1)}, chronic: ${chronic.toFixed(1)}. Pattern suggests acute.` };
    if (hco3 <= chronic + 2) return { status:'Chronic (compensated)', detail:`Expected HCO3 acute: ${acute.toFixed(1)}, chronic: ${chronic.toFixed(1)}. Pattern suggests chronic.` };
    return { status:'Partially compensated', detail:`Expected HCO3 acute: ${acute.toFixed(1)}, chronic: ${chronic.toFixed(1)}. Intermediate.` };
  }
  return { status:'No significant disorder', detail:'Acid-base parameters are within normal limits.' };
}

function compensationAdequacy(ph, pco2, hco3) {
  if (ph >= 7.35 && ph <= 7.45 && pco2 >= 35 && pco2 <= 45 && hco3 >= 22 && hco3 <= 26) {
    return { isAdequate:true, verdict:'N/A', severity:'normal', explanation:'Acid-base parameters within normal limits. No compensation required.', formula:'None', expectedValue:'—', actualValue:'—' };
  }
  if (hco3 < 22) {
    const exp = 1.5 * hco3 + 8, lo = exp - 2, hi = exp + 2;
    const ok = pco2 >= lo && pco2 <= hi;
    const expl = ok
      ? `Respiratory compensation is ADEQUATE. PaCO2 (${pco2}) falls within expected range ${lo.toFixed(1)}–${hi.toFixed(1)} mmHg by Winters' formula.`
      : pco2 > hi
        ? `Respiratory compensation is INADEQUATE — PaCO2 (${pco2}) is HIGHER than expected upper limit (${hi.toFixed(1)}). Suggests superimposed respiratory acidosis.`
        : `Respiratory compensation EXCEEDS expected — PaCO2 (${pco2}) is LOWER than expected lower limit (${lo.toFixed(1)}). Suggests concurrent respiratory alkalosis.`;
    return { isAdequate:ok, verdict:ok?'Adequate':'Inadequate', severity:ok?'normal':pco2>hi?'critical':'abnormal', explanation:expl, formula:"Winters': Expected PaCO2 = (1.5 × HCO3) + 8 ± 2", expectedValue:`${lo.toFixed(1)} – ${hi.toFixed(1)} mmHg`, actualValue:`${pco2} mmHg` };
  }
  if (hco3 > 26) {
    const exp = 0.7 * hco3 + 21, lo = exp - 2, hi = exp + 2;
    const ok = pco2 >= lo && pco2 <= hi;
    const expl = ok
      ? `Respiratory compensation is ADEQUATE. PaCO2 (${pco2}) is within expected range ${lo.toFixed(1)}–${hi.toFixed(1)} mmHg.`
      : pco2 > hi
        ? `Respiratory compensation INADEQUATE — PaCO2 (${pco2}) > expected (${hi.toFixed(1)}). Concurrent respiratory acidosis.`
        : `Respiratory compensation EXCEEDS expected — PaCO2 (${pco2}) < expected (${lo.toFixed(1)}). Concurrent respiratory alkalosis.`;
    return { isAdequate:ok, verdict:ok?'Adequate':'Inadequate', severity:ok?'normal':'abnormal', explanation:expl, formula:'Expected PaCO2 = (0.7 × HCO3) + 21 ± 2', expectedValue:`${lo.toFixed(1)} – ${hi.toFixed(1)} mmHg`, actualValue:`${pco2} mmHg` };
  }
  if (pco2 > 45) {
    const acute = 24 + 1 * ((pco2-40)/10), chronic = 24 + 3.5 * ((pco2-40)/10);
    const ok = hco3 >= acute - 1 && hco3 <= chronic + 2;
    const expl = ok
      ? `Metabolic compensation is ADEQUATE. HCO3 (${hco3}) between acute (${acute.toFixed(1)}) and chronic (${chronic.toFixed(1)}) expected values.`
      : hco3 < acute - 1
        ? `Metabolic compensation INADEQUATE — HCO3 (${hco3}) < acute expected (${acute.toFixed(1)}). Suggests concurrent metabolic acidosis.`
        : `Metabolic compensation EXCEEDS expected — HCO3 (${hco3}) > chronic expected (${chronic.toFixed(1)}). Suggests concurrent metabolic alkalosis.`;
    return { isAdequate:ok, verdict:ok?'Adequate':'Inadequate', severity:ok?'normal':'abnormal', explanation:expl, formula:'Acute: ΔHCO3 = 1×(ΔPCO2/10); Chronic: ΔHCO3 = 3.5×(ΔPCO2/10)', expectedValue:`Acute: ${acute.toFixed(1)}, Chronic: ${chronic.toFixed(1)} mEq/L`, actualValue:`${hco3} mEq/L` };
  }
  if (pco2 < 35) {
    const acute = 24 - 2 * ((40-pco2)/10), chronic = 24 - 5 * ((40-pco2)/10);
    const ok = hco3 <= acute + 1 && hco3 >= chronic - 2;
    const expl = ok
      ? `Metabolic compensation is ADEQUATE. HCO3 (${hco3}) between acute (${acute.toFixed(1)}) and chronic (${chronic.toFixed(1)}) expected values.`
      : hco3 > acute + 1
        ? `Metabolic compensation INADEQUATE — HCO3 (${hco3}) > acute expected (${acute.toFixed(1)}). Suggests concurrent metabolic alkalosis.`
        : `Metabolic compensation EXCEEDS expected — HCO3 (${hco3}) < chronic expected (${chronic.toFixed(1)}). Suggests concurrent metabolic acidosis.`;
    return { isAdequate:ok, verdict:ok?'Adequate':'Inadequate', severity:ok?'normal':'abnormal', explanation:expl, formula:'Acute: ΔHCO3 = 2×(ΔPCO2/10); Chronic: ΔHCO3 = 5×(ΔPCO2/10)', expectedValue:`Acute: ${acute.toFixed(1)}, Chronic: ${chronic.toFixed(1)} mEq/L`, actualValue:`${hco3} mEq/L` };
  }
  return { isAdequate:true, verdict:'N/A', severity:'normal', explanation:'No primary disorder requiring compensation assessment.', formula:'None', expectedValue:'—', actualValue:'—' };
}

function anionGap(na, cl, hco3, albumin) {
  const raw = na - (cl + hco3);
  const corrected = raw + 2.5 * (4 - albumin);
  let status, severity;
  if (corrected > 20) { status='Elevated (high anion gap)'; severity='critical'; }
  else if (corrected > 12) { status='Mildly elevated'; severity='abnormal'; }
  else if (corrected < 6)  { status='Low anion gap';       severity='abnormal'; }
  else { status='Normal'; severity='normal'; }
  return { value: Math.round(raw*10)/10, corrected: Math.round(corrected*10)/10, status, severity };
}

function deltaRatio(ag, hco3) {
  if (ag <= 12) return null;
  const excess = ag - 12, delta = 24 - hco3;
  if (delta === 0) return null;
  const ratio = excess / delta;
  let interp, severity;
  if (ratio < 0.4)       { interp='Hyperchloremic normal AG acidosis'; severity='abnormal'; }
  else if (ratio < 1)    { interp='Combined high AG + normal AG metabolic acidosis'; severity='abnormal'; }
  else if (ratio <= 2)   { interp='Pure high AG metabolic acidosis'; severity='normal'; }
  else                   { interp='Concurrent metabolic alkalosis'; severity='abnormal'; }
  return { value: Math.round(ratio*100)/100, interpretation: interp, severity };
}

function aaDifference(po2, pco2, fio2, age) {
  const pao2 = fio2/100 * 713 - pco2/0.8 - po2;
  const expected = age/4 + 4;
  let status, severity;
  if (pao2 <= expected + 5)       { status='Normal'; severity='normal'; }
  else if (pao2 <= expected + 20) { status='Mildly elevated'; severity='abnormal'; }
  else                            { status='Significantly elevated'; severity='critical'; }
  return { value: Math.round(pao2*10)/10, expected: Math.round(expected*10)/10, status, severity };
}

function pfRatio(po2, fio2) {
  const val = po2 / (fio2/100);
  let status, severity, ardsGrade;
  if (val >= 400) { status='Normal oxygenation'; severity='normal'; ardsGrade='None'; }
  else if (val >= 300) { status='Mild impairment'; severity='abnormal'; ardsGrade='Mild ARDS'; }
  else if (val >= 200) { status='Moderate impairment'; severity='abnormal'; ardsGrade='Moderate ARDS'; }
  else if (val >= 100) { status='Severe impairment'; severity='critical'; ardsGrade='Severe ARDS'; }
  else { status='Very severe impairment'; severity='critical'; ardsGrade='Severe ARDS (refractory)'; }
  return { value: Math.round(val), status, severity, ardsGrade };
}

function differentials(disorder, ag, lactate) {
  const list = [];
  if (ag.corrected > 12) {
    if (lactate > 2) list.push('Lactic acidosis (Type A: tissue hypoperfusion / Type B: metabolic)');
    list.push('Diabetic ketoacidosis (check blood glucose, ketones)');
    list.push('Uremia (check BUN, creatinine)');
    list.push('Toxic ingestion (methanol, ethylene glycol, salicylate)');
    if (lactate <= 2) list.push('Starvation ketoacidosis');
  }
  if (disorder.includes('metabolic acidosis') && ag.corrected <= 12) {
    list.push('Diarrhea / GI bicarbonate loss');
    list.push('Renal tubular acidosis (Type I, II, or IV)');
    list.push('Normal saline infusion (dilutional)');
    list.push('Ureterosigmoidostomy');
  }
  if (disorder.includes('metabolic alkalosis')) {
    list.push('Vomiting / NG suction (chloride-responsive)');
    list.push('Diuretic use (contraction alkalosis)');
    list.push('Hyperaldosteronism (chloride-resistant)');
    list.push('Massive transfusion (citrate metabolism)');
  }
  if (disorder.includes('respiratory acidosis')) {
    list.push('COPD exacerbation / airway obstruction');
    list.push('Neuromuscular weakness (GBS, myasthenia)');
    list.push('Central hypoventilation (sedation, brainstem)');
    list.push('Severe pneumonia / pulmonary edema');
  }
  if (disorder.includes('respiratory alkalosis')) {
    list.push('Anxiety / pain-driven hyperventilation');
    list.push('Sepsis (early phase)');
    list.push('Pulmonary embolism');
    list.push('Hepatic encephalopathy');
  }
  if (list.length === 0) list.push('No specific differentials — acid-base status is normal');
  return list;
}

function ventilatorComment(patientData, ph, pco2, po2, fio2, pf, disorder, compAdequacy) {
  const vent = patientData.ventilation;
  const vt   = n(patientData.tidalVolume);
  const rr   = n(patientData.respiratoryRate);
  const peep = n(patientData.peep);
  const pip  = n(patientData.pip);
  const pplat= n(patientData.plateauPressure);
  const ibw  = n(patientData.ibw);

  const isVentilated = vent === 'imv' || vent === 'niv' || vent === 'hfnc';
  const hasSettings  = isVentilated && (vt > 0 || rr > 0 || peep > 0);

  if (!isVentilated) {
    const recs = [];
    if (po2 < 60 || pf < 200) recs.push({ parameter:'Oxygenation', finding:`PaO2 ${po2} mmHg, P/F ratio ${pf} on ${vent||'current support'}`, suggestion:'Severe hypoxemia — consider escalation to NIV or invasive MV.', severity:'critical' });
    if (pco2 > 50) recs.push({ parameter:'Ventilation', finding:`PaCO2 ${pco2} mmHg — CO2 retention`, suggestion:'Hypercapnia without mechanical support — evaluate for NIV initiation.', severity:'critical' });
    return { hasVentSettings:false, overallAssessment: recs.length===0 ? 'Patient not on mechanical ventilation.' : `${recs.length} finding(s) noted.`, severity: recs.some(r=>r.severity==='critical')?'critical':'normal', recommendations:recs };
  }
  if (!hasSettings) {
    return { hasVentSettings:false, overallAssessment:'Enter Vt, RR, PEEP, and pressures for detailed ventilator analysis.', severity:'normal', recommendations:[] };
  }

  const recs = [];
  const mv   = vt > 0 && rr > 0 ? vt * rr / 1000 : 0;
  const vtKg = vt > 0 && ibw > 0 ? vt / ibw : 0;

  if (vtKg > 0) {
    if (vtKg > 8) recs.push({ parameter:'Tidal Volume', finding:`Vt ${vt} mL = ${vtKg.toFixed(1)} mL/kg IBW (exceeds 8 mL/kg)`, suggestion:`Reduce Vt to 6–8 mL/kg IBW (${Math.round(ibw*6)}–${Math.round(ibw*8)} mL). In ARDS, target 4–6 mL/kg.`, severity:'critical' });
    else if (vtKg >= 6) recs.push({ parameter:'Tidal Volume', finding:`Vt ${vt} mL = ${vtKg.toFixed(1)} mL/kg IBW`, suggestion:`Lung-protective range. ${pf<200?'For ARDS with P/F <200, consider reducing further to 4–6 mL/kg IBW.':'Appropriate.'}`, severity:pf<200?'abnormal':'normal' });
    else if (vtKg < 4) recs.push({ parameter:'Tidal Volume', finding:`Vt ${vt} mL = ${vtKg.toFixed(1)} mL/kg IBW (very low)`, suggestion:'May lead to atelectasis. Consider increasing to 4–6 mL/kg IBW unless on ECMO strategy.', severity:'abnormal' });
  } else if (vt > 0 && ibw === 0) {
    recs.push({ parameter:'Tidal Volume', finding:`Vt ${vt} mL (IBW not provided)`, suggestion:'Enter IBW for accurate Vt/kg calculation. Target: 6–8 mL/kg IBW (4–6 mL/kg in ARDS).', severity:'abnormal' });
  }

  if (rr > 30) recs.push({ parameter:'Respiratory Rate', finding:`RR ${rr}/min — high`, suggestion:'Very high RR increases risk of auto-PEEP. Check for intrinsic PEEP.', severity:'critical' });
  else if (rr > 25) recs.push({ parameter:'Respiratory Rate', finding:`RR ${rr}/min`, suggestion:'Moderately high RR. Monitor for auto-PEEP.', severity:'abnormal' });

  if (mv > 0) {
    if (pco2 > 45 && !compAdequacy.isAdequate) recs.push({ parameter:'Minute Ventilation', finding:`MV ${mv.toFixed(1)} L/min with PaCO2 ${pco2} mmHg — inadequate CO2 clearance`, suggestion:`Increase RR by 2–4 breaths/min or Vt by 50–100 mL within lung-protective limits. ${ph<7.2?'URGENT: pH <7.20.':''}`, severity:ph<7.2?'critical':'abnormal' });
    else if (pco2 < 30) recs.push({ parameter:'Minute Ventilation', finding:`MV ${mv.toFixed(1)} L/min with PaCO2 ${pco2} mmHg — over-ventilation`, suggestion:'Reduce RR by 2–4 breaths/min. Excessive alkalosis can cause arrhythmias and cerebral vasoconstriction.', severity:'abnormal' });
    else if (pco2 >= 35 && pco2 <= 45) recs.push({ parameter:'Minute Ventilation', finding:`MV ${mv.toFixed(1)} L/min with PaCO2 ${pco2} mmHg`, suggestion:'Minute ventilation adequate — PaCO2 within normal range.', severity:'normal' });
  }

  if (peep > 0) {
    if (pf < 100 && peep < 12) recs.push({ parameter:'PEEP', finding:`PEEP ${peep} cmH2O with P/F ratio ${pf} (severe ARDS)`, suggestion:'PEEP appears LOW for severe hypoxemia. Consider incremental PEEP titration (target 14–24 cmH2O per ARDSNet).', severity:'critical' });
    else if (pf < 200 && peep < 10) recs.push({ parameter:'PEEP', finding:`PEEP ${peep} cmH2O with P/F ratio ${pf} (moderate ARDS)`, suggestion:'Consider PEEP 10–14 cmH2O per ARDSNet lower PEEP table.', severity:'abnormal' });
    else if (peep > 15 && pf > 300) recs.push({ parameter:'PEEP', finding:`PEEP ${peep} cmH2O with P/F ratio ${pf}`, suggestion:'Oxygenation improving — consider gradual PEEP de-escalation if hemodynamically stable.', severity:'abnormal' });
    else recs.push({ parameter:'PEEP', finding:`PEEP ${peep} cmH2O`, suggestion:'PEEP within reasonable range. Continue monitoring oxygenation and hemodynamics.', severity:'normal' });
  }

  if (pplat > 0) {
    const dp = peep > 0 ? pplat - peep : 0;
    if (pplat > 30) recs.push({ parameter:'Plateau Pressure', finding:`Pplat ${pplat} cmH2O — exceeds 30 cmH2O`, suggestion:'HIGH barotrauma risk. IMMEDIATELY reduce Vt (target 4–6 mL/kg IBW). Allow permissive hypercapnia (pH >7.20).', severity:'critical' });
    else if (pplat > 25) recs.push({ parameter:'Plateau Pressure', finding:`Pplat ${pplat} cmH2O`, suggestion:'Approaching upper limit. Ensure Vt is within 6 mL/kg IBW.', severity:'abnormal' });
    else recs.push({ parameter:'Plateau Pressure', finding:`Pplat ${pplat} cmH2O`, suggestion:'Within safe range (<30 cmH2O).', severity:'normal' });
    if (dp > 15) recs.push({ parameter:'Driving Pressure', finding:`ΔP = Pplat − PEEP = ${pplat} − ${peep} = ${dp} cmH2O (>15)`, suggestion:'Driving pressure >15 cmH2O associated with increased ARDS mortality. Reduce Vt or optimize PEEP.', severity:'critical' });
    else if (dp > 0) recs.push({ parameter:'Driving Pressure', finding:`ΔP = Pplat − PEEP = ${pplat} − ${peep} = ${dp} cmH2O`, suggestion:'Driving pressure ≤15 cmH2O — within target range.', severity:'normal' });
  }

  if (pip > 40) recs.push({ parameter:'Peak Inspiratory Pressure', finding:`PIP ${pip} cmH2O — very high`, suggestion:'Check PIP-Pplat gradient. If wide, address airway resistance (secretions, bronchospasm, kinked ETT). If narrow, reduce Vt.', severity:'critical' });
  else if (pip > 35) recs.push({ parameter:'Peak Inspiratory Pressure', finding:`PIP ${pip} cmH2O`, suggestion:'Elevated PIP. Assess for airway obstruction, secretions, or bronchospasm.', severity:'abnormal' });

  if (fio2 > 60 && po2 > 100) recs.push({ parameter:'FiO2', finding:`FiO2 ${fio2}% with PaO2 ${po2} mmHg — hyperoxia risk`, suggestion:'Wean FiO2 to target SpO2 92–96%. Prolonged hyperoxia causes absorptive atelectasis and oxygen toxicity.', severity:'abnormal' });
  else if (fio2 > 80 && po2 < 60) recs.push({ parameter:'FiO2', finding:`FiO2 ${fio2}% with PaO2 ${po2} mmHg — refractory hypoxemia`, suggestion:'Consider: prone positioning ≥16 hrs, neuromuscular blockade, inhaled prostacyclin/NO, ECMO referral if P/F <80.', severity:'critical' });

  const critCount = recs.filter(r=>r.severity==='critical').length;
  const abnCount  = recs.filter(r=>r.severity==='abnormal').length;
  let overallSev = 'normal', assessment = '';
  if (critCount > 0) { overallSev='critical'; assessment=`${critCount} critical and ${abnCount} sub-optimal finding(s). Immediate review recommended.`; }
  else if (abnCount > 0) { overallSev='abnormal'; assessment=`${abnCount} finding(s) warrant attention in ventilator settings.`; }
  else { assessment='Ventilator settings appear appropriate for current ABG values.'; }

  return { hasVentSettings:true, overallAssessment:assessment, severity:overallSev, recommendations:recs };
}

// ─── Build Parameters Array ───────────────

function buildParameters(ph, pco2, po2, hco3, be, na, k, cl, lactate, sao2) {
  const params = [
    { label:'pH',       value: ph.toFixed(2),  unit:'',       normalRange:'7.35 – 7.45', ...assessPH(ph) },
    { label:'PaCO2',    value: pco2.toFixed(1), unit:'mmHg',   normalRange:'35 – 45',    ...assessPCO2(pco2) },
    { label:'PaO2',     value: po2.toFixed(1),  unit:'mmHg',   normalRange:'80 – 100',   ...assessPO2(po2) },
    { label:'HCO3',     value: hco3.toFixed(1), unit:'mEq/L',  normalRange:'22 – 26',    ...assessHCO3(hco3) },
    { label:'Base Excess', value: be.toFixed(1), unit:'mEq/L', normalRange:'-2 to +2',   status: Math.abs(be)>5?'critical':Math.abs(be)>2?'abnormal':'normal', label2: be>2?'Base excess':be<-2?'Base deficit':'Normal' },
    { label:'Na+',      value: na.toFixed(0),   unit:'mEq/L',  normalRange:'135 – 145',  status: na<130||na>150?'critical':na<135||na>145?'abnormal':'normal', label2: na<135?'Hyponatremia':na>145?'Hypernatremia':'Normal' },
    { label:'K+',       value: k.toFixed(1),    unit:'mEq/L',  normalRange:'3.5 – 5.0',  status: k<3||k>6?'critical':k<3.5||k>5?'abnormal':'normal', label2: k<3.5?'Hypokalemia':k>5?'Hyperkalemia':'Normal' },
    { label:'Cl-',      value: cl.toFixed(0),   unit:'mEq/L',  normalRange:'96 – 106',   status: cl<90||cl>115?'critical':cl<96||cl>106?'abnormal':'normal', label2: cl<96?'Hypochloremia':cl>106?'Hyperchloremia':'Normal' },
    { label:'Lactate',  value: lactate.toFixed(1), unit:'mmol/L', normalRange:'0.5 – 2.0', status: lactate>4?'critical':lactate>2?'abnormal':'normal', label2: lactate>4?'Severe hyperlactatemia':lactate>2?'Elevated':'Normal' },
  ];
  // Fix label property for extra fields
  params.forEach(p => { if (p.label2) { p.interpretation = p.label2; delete p.label2; } });
  if (sao2 > 0) {
    params.push({ label:'SpO2/SaO2', value: sao2.toFixed(0), unit:'%', normalRange:'94 – 100', status: sao2<88?'critical':sao2<94?'abnormal':'normal', interpretation: sao2<88?'Severe desaturation':sao2<94?'Desaturation':'Normal' });
  }
  return params;
}

// ─── Main Analysis ────────────────────────

function analyze() {
  const ph      = n($('input-ph').value);
  const pco2    = n($('input-pco2').value);
  const po2     = n($('input-po2').value);
  const hco3    = n($('input-hco3').value);
  const be      = n($('input-be').value);
  const na      = n($('input-na').value);
  const k       = n($('input-k').value);
  const cl      = n($('input-cl').value);
  const lactate = n($('input-lactate').value);
  const albumin = n($('input-albumin').value) || 4;
  const sao2    = n($('input-sao2').value);
  const fio2    = n($('input-fio2').value) || 21;
  const age     = n($('input-age').value) || 50;

  const patientData = {
    age: $('input-age').value,
    sex: $('input-sex').value,
    uhid: $('input-uhid').value,
    diagnosis: $('input-diagnosis').value,
    ventilation: $('input-vent').value,
    fio2: $('input-fio2').value,
    history: $('input-history').value,
    tidalVolume: $('input-vt').value,
    respiratoryRate: $('input-rr').value,
    peep: $('input-peep').value,
    pip: $('input-pip').value,
    plateauPressure: $('input-pplat').value,
    ibw: $('input-ibw').value,
  };

  const disorder     = primaryDisorder(ph, pco2, hco3);
  const dispSeverity = severityOfDisorder(ph, pco2, hco3);
  const compDetail   = compensationDetail(ph, pco2, hco3);
  const compAdq      = compensationAdequacy(ph, pco2, hco3);
  const ag           = anionGap(na, cl, hco3, albumin);
  const dr           = deltaRatio(ag.corrected, hco3);
  const aa           = aaDifference(po2, pco2, fio2, age);
  const pf           = pfRatio(po2, fio2);
  const params       = buildParameters(ph, pco2, po2, hco3, be, na, k, cl, lactate, sao2);
  const diffs        = differentials(disorder, ag, lactate);
  const ventComment  = ventilatorComment(patientData, ph, pco2, po2, fio2, pf.value, disorder, compAdq);

  let oxStatus, oxSeverity, oxDetails;
  if (po2 >= 80 && pf.value >= 400) { oxStatus='Adequate oxygenation'; oxSeverity='normal'; oxDetails=`PaO2 and P/F ratio within normal limits.`; }
  else if (po2 >= 60)  { oxStatus='Mild oxygenation impairment'; oxSeverity='abnormal'; oxDetails=`PaO2 ${po2} mmHg on FiO2 ${fio2}%. P/F ratio: ${pf.value}`; }
  else { oxStatus='Severe oxygenation failure'; oxSeverity='critical'; oxDetails=`PaO2 ${po2} mmHg on FiO2 ${fio2}%. P/F ratio: ${pf.value}. ${pf.ardsGrade}`; }

  const summaryParts = [`${disorder}.`];
  if (compDetail.status !== 'No significant disorder') summaryParts.push(`Compensation: ${compDetail.status}.`);
  if (compAdq.verdict !== 'N/A') summaryParts.push(`Compensation adequacy: ${compAdq.verdict}.`);
  if (ag.corrected > 12) { summaryParts.push(`Corrected anion gap elevated at ${ag.corrected} (${ag.status}).`); if(dr) summaryParts.push(`Delta ratio ${dr.value}: ${dr.interpretation}.`); }
  if (lactate > 2) summaryParts.push(`Lactate ${lactate} mmol/L — consider tissue hypoperfusion.`);
  summaryParts.push(`Oxygenation: ${oxStatus}. A-a gradient: ${aa.value} mmHg (expected <${aa.expected}).`);

  return { disorder, dispSeverity, compDetail, compAdq, ag, dr, aa, pf, params, diffs, ventComment, oxStatus, oxSeverity, oxDetails, clinicalSummary: summaryParts.join(' '), patientData };
}

// ─── Render Results ───────────────────────

function renderResults(r) {
  const pd = r.patientData;
  let html = '';

  // Patient strip
  if (pd.age || pd.uhid || pd.diagnosis || pd.ventilation) {
    html += `<div class="result-patient-strip">`;
    if (pd.age)       html += `<span>${pd.age}y / ${pd.sex||'—'}</span>`;
    if (pd.uhid)      html += `<span>UHID: ${pd.uhid}</span>`;
    if (pd.diagnosis) html += `<span style="font-style:italic">${pd.diagnosis}</span>`;
    if (pd.ventilation) html += `<span>Mode: ${pd.ventilation.toUpperCase()}</span>`;
    if (pd.fio2)      html += `<span>FiO2: ${pd.fio2}%</span>`;
    html += `</div>`;
  }

  // Primary disorder
  html += `<div class="disorder-card severity-${r.dispSeverity} card">
    ${statusIcon(r.dispSeverity)}
    <div class="disorder-main">
      <div class="disorder-title">${r.disorder}</div>
      <div class="disorder-sub">${r.compDetail.status} — ${r.compDetail.detail}</div>
    </div>
    ${badge(r.dispSeverity, r.dispSeverity === 'normal' ? 'Normal' : r.dispSeverity === 'abnormal' ? 'Abnormal' : 'Critical')}
  </div>`;

  // Compensation adequacy
  if (r.compAdq.verdict !== 'N/A') {
    html += `<div class="card compensation-card" style="margin-bottom:12px;">
      <div class="card-header">
        <div class="card-title">
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/></svg>
          Compensation Adequacy
          ${badge(r.compAdq.severity, r.compAdq.verdict)}
        </div>
      </div>
      <div class="card-body">
        <p style="font-size:.825rem;line-height:1.65;">${r.compAdq.explanation}</p>
        <div class="comp-formula-row">
          <div class="comp-formula-item"><div class="cf-label">Formula Used</div><div class="cf-value">${r.compAdq.formula}</div></div>
          <div class="comp-formula-item"><div class="cf-label">Expected</div><div class="cf-value">${r.compAdq.expectedValue}</div></div>
          <div class="comp-formula-item"><div class="cf-label">Actual</div><div class="cf-value" style="font-weight:700;">${r.compAdq.actualValue}</div></div>
        </div>
      </div>
    </div>`;
  }

  // Metrics grid
  html += `<div class="metrics-grid">`;
  const metrics = [
    { label:'P/F Ratio', value: r.pf.value, sub: r.pf.ardsGrade, severity: r.pf.severity },
    { label:'A-a Gradient', value: `${r.aa.value}`, sub: `Expected: <${r.aa.expected}`, severity: r.aa.severity, unit:'mmHg' },
    { label:'Anion Gap', value: `${r.ag.corrected}`, sub: `Uncorrected: ${r.ag.value}`, severity: r.ag.severity, unit:'corrected' },
    r.dr
      ? { label:'Delta Ratio', value: `${r.dr.value}`, sub: r.dr.interpretation, severity: r.dr.severity }
      : { label:'Delta Ratio', value: '—', sub: 'Only in HAGMA', severity:'normal' }
  ];
  metrics.forEach(m => {
    html += `<div class="metric-card">
      <div class="metric-top"><span class="metric-label">${m.label}</span>${statusIcon(m.severity)}</div>
      <div class="metric-value">${m.value}${m.unit?`<span style="font-size:.75rem;font-weight:400;color:var(--text-faint);margin-left:3px;">${m.unit}</span>`:''}</div>
      <div class="metric-sub">${m.sub}</div>
    </div>`;
  });
  html += `</div>`;

  // Three-column section
  html += `<div class="results-cols">`;

  // Parameter table (wide)
  html += `<div class="card col-wide">
    <div class="card-header">
      <div class="card-title">
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8M16 13H8M16 17H8"/></svg>
        Parameter Summary
      </div>
    </div>
    <div class="card-body" style="padding-top:8px;padding-bottom:10px;">
      <div class="param-list">`;
  r.params.forEach(p => {
    html += `<div class="param-row">
      <div class="param-left">
        ${statusIcon(p.status)}
        <span class="param-name">${p.label}</span>
      </div>
      <div class="param-right">
        <span class="param-normal-range">${p.normalRange}</span>
        <span class="param-value">${p.value} <span class="param-unit">${p.unit}</span></span>
        ${badge(p.status, p.interpretation)}
      </div>
    </div>`;
  });
  html += `</div></div></div>`;

  // Right column: oxygenation + differentials
  html += `<div style="display:flex;flex-direction:column;gap:12px;">`;

  // Oxygenation card
  html += `<div class="card">
    <div class="card-header">
      <div class="card-title">
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"/><path d="M9.6 4.6A2 2 0 1 1 11 8H2"/><path d="M12.6 19.4A2 2 0 1 0 14 16H2"/></svg>
        Oxygenation
      </div>
    </div>
    <div class="card-body">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
        ${statusIcon(r.oxSeverity)}
        <span style="font-size:.825rem;font-weight:600;">${r.oxStatus}</span>
      </div>
      <p style="font-size:.75rem;color:var(--text-muted);">${r.oxDetails}</p>
    </div>
  </div>`;

  // Differentials card
  html += `<div class="card">
    <div class="card-header">
      <div class="card-title">
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
        Differentials
      </div>
    </div>
    <div class="card-body">
      <ul class="diff-list">`;
  r.diffs.forEach(d => {
    html += `<li class="diff-item"><span class="diff-icon">${iconTrend()}</span><span>${d}</span></li>`;
  });
  html += `</ul></div></div>`;
  html += `</div>`; // end right col
  html += `</div>`; // end results-cols

  // Ventilator commentary
  if (r.ventComment.recommendations.length > 0) {
    html += `<div class="card" style="border-left:4px solid ${r.ventComment.severity==='critical'?'var(--status-critical)':r.ventComment.severity==='abnormal'?'var(--status-abnormal)':'var(--status-normal)'};margin-bottom:12px;">
      <div class="card-header">
        <div class="card-title">
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 7h-9M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/></svg>
          Ventilator Commentary
          ${badge(r.ventComment.severity, r.ventComment.severity==='critical'?'Needs Attention':r.ventComment.severity==='abnormal'?'Review':'Satisfactory')}
        </div>
      </div>
      <div class="card-body">
        <p style="font-size:.75rem;color:var(--text-muted);margin-bottom:10px;">${r.ventComment.overallAssessment}</p>
        <div>`;
    r.ventComment.recommendations.forEach(rec => {
      html += `<div class="rec-card severity-${rec.severity}">
        <div class="rec-header">${statusIcon(rec.severity)}<span class="rec-param">${rec.parameter}</span></div>
        <div class="rec-finding">${rec.finding}</div>
        <div class="rec-suggestion">${rec.suggestion}</div>
      </div>`;
    });
    html += `</div></div></div>`;
  }

  // Clinical summary
  html += `<div class="card" style="margin-bottom:12px;">
    <div class="card-header">
      <div class="card-title">
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 2v2M5 2v2M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1M8 15a6 6 0 0 0 12 0v-3"/><circle cx="20" cy="10" r="2"/></svg>
        Clinical Summary
      </div>
    </div>
    <div class="card-body">
      <p class="summary-text">${r.clinicalSummary}</p>
      ${pd.history ? `<hr class="divider"><div class="section-label" style="margin-bottom:6px;">Clinical Notes</div><p style="font-size:.775rem;color:var(--text-muted);">${pd.history}</p>` : ''}
    </div>
  </div>`;

  return html;
}

// ─── Tab Logic ────────────────────────────

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (btn.disabled) return;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    $(`panel-${btn.dataset.tab}`).classList.add('active');
  });
});

// ─── Ventilator settings toggle ──────────
$('input-vent').addEventListener('change', function() {
  const showVent = ['imv','niv','hfnc'].includes(this.value);
  $('vent-settings').style.display = showVent ? 'block' : 'none';
});

// ─── Analyze button ───────────────────────
$('btn-analyze').addEventListener('click', () => {
  const ph   = $('input-ph').value;
  const pco2 = $('input-pco2').value;
  const hco3 = $('input-hco3').value;
  if (!ph || !pco2 || !hco3) {
    alert('Please enter at least pH, PaCO2, and HCO3 to analyze.');
    return;
  }
  const results = analyze();
  $('results-content').innerHTML = renderResults(results);
  $('tab-results').disabled = false;
  $('btn-print').style.display = '';
  // Switch to results tab
  document.querySelector('.tab-btn[data-tab="input"]').classList.remove('active');
  $('panel-input').classList.remove('active');
  $('tab-results').classList.add('active');
  $('panel-results').classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// ─── Reset button ────────────────────────
$('btn-reset').addEventListener('click', () => {
  document.querySelectorAll('.form-input, .form-textarea').forEach(el => {
    if (!['input-na','input-k','input-cl','input-albumin','input-fio2'].includes(el.id)) el.value = '';
  });
  $('input-na').value    = '140';
  $('input-k').value     = '4.0';
  $('input-cl').value    = '102';
  $('input-albumin').value = '4.0';
  $('input-fio2').value  = '21';
  $('input-sex').value   = '';
  $('input-vent').value  = '';
  $('vent-settings').style.display = 'none';
  $('results-content').innerHTML = '';
  $('tab-results').disabled = true;
  $('tab-results').classList.remove('active');
  $('panel-results').classList.remove('active');
  document.querySelector('.tab-btn[data-tab="input"]').classList.add('active');
  $('panel-input').classList.add('active');
  $('btn-print').style.display = 'none';
});

// ─── Back button ────────────────────────
$('btn-back').addEventListener('click', () => {
  $('tab-results').classList.remove('active');
  $('panel-results').classList.remove('active');
  document.querySelector('.tab-btn[data-tab="input"]').classList.add('active');
  $('panel-input').classList.add('active');
});

// ─── Print button ────────────────────────
$('btn-print').addEventListener('click', () => window.print());

// ─── Theme toggle ────────────────────────
$('btn-theme').addEventListener('click', () => {
  const html = document.documentElement;
  const isDark = html.getAttribute('data-theme') === 'dark';
  html.setAttribute('data-theme', isDark ? 'light' : 'dark');
});

// ─── Auto-disable analyze btn ───────────
function checkAnalyzeBtn() {
  const ready = $('input-ph').value && $('input-pco2').value && $('input-hco3').value;
  $('btn-analyze').disabled = !ready;
}
['input-ph','input-pco2','input-hco3'].forEach(id => {
  $(id).addEventListener('input', checkAnalyzeBtn);
});
checkAnalyzeBtn();
