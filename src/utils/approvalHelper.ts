import { Transaction } from '../types';

export function isTxApproved(tx: Transaction): boolean {
  if (tx.type !== 'Inflow') return true; // Only Inflows are subject to reconciliation/approval
  
  const isApprovedVal = tx.isApproved;
  if (isApprovedVal === true || isApprovedVal === 'TRUE' || isApprovedVal === 'true') {
    return true;
  }
  if (isApprovedVal === false || isApprovedVal === 'FALSE' || isApprovedVal === 'false') {
    return false;
  }
  
  // If undefined/missing (like existing database items), check if recordedBy is from Pengelola
  // We check name 'pengelola' or 'Pengelola'
  const recordedByLower = (tx.recordedBy || '').toLowerCase();
  const fromPengelola = recordedByLower === 'pengelola';
  
  // If recorded from Pengelola, default to unapproved/pending. Otherwise, assume approved/true.
  return !fromPengelola;
}
