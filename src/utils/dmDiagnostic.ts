/**
 * DM Participant Diagnostic Utility
 * 
 * Verifies that both sender and receiver UIDs match the Firestore 'participants'
 * array exactly, ensures isolated two-party communication, and logs any discrepancies,
 * missing UIDs, extra participants, or malformed conversation IDs to the console.
 */

export interface ParticipantVerificationResult {
  isValid: boolean;
  docId?: string;
  senderUid: string;
  targetUid: string;
  expectedParticipants: string[];
  actualParticipants: string[];
  mismatches: string[];
  conversationId?: string;
  expectedConversationId: string;
}

/**
 * Diagnostic function to verify a single document or conversation payload
 * against the expected sender and target UIDs.
 */
export function verifyDMParticipants(
  senderUid: string,
  targetUid: string,
  docData: {
    id?: string;
    participants?: unknown;
    senderId?: unknown;
    receiverId?: unknown;
    conversationId?: unknown;
    [key: string]: any;
  }
): ParticipantVerificationResult {
  const mismatches: string[] = [];

  const cleanSender = String(senderUid || '').trim();
  const cleanTarget = String(targetUid || '').trim();
  const expectedParticipants = [cleanSender, cleanTarget].sort();
  const expectedConversationId = expectedParticipants.join('_');

  const rawParticipants = docData.participants;
  const actualParticipants: string[] = Array.isArray(rawParticipants)
    ? rawParticipants.map((p) => String(p || '').trim()).filter(Boolean)
    : [];

  const actualSenderId = docData.senderId ? String(docData.senderId).trim() : undefined;
  const actualReceiverId = docData.receiverId ? String(docData.receiverId).trim() : undefined;
  const actualConversationId = docData.conversationId ? String(docData.conversationId).trim() : undefined;

  // 1. Check participants array existence and type
  if (!Array.isArray(rawParticipants)) {
    mismatches.push(`Document ${docData.id || '(new)'} is missing 'participants' array or it is not an Array (got ${typeof rawParticipants})`);
  }

  // 2. Check that participants array contains sender UID
  if (!actualParticipants.includes(cleanSender)) {
    mismatches.push(`Participants array does not contain sender UID: "${cleanSender}". Found: [${actualParticipants.join(', ')}]`);
  }

  // 3. Check that participants array contains target UID
  if (!actualParticipants.includes(cleanTarget)) {
    mismatches.push(`Participants array does not contain receiver/target UID: "${cleanTarget}". Found: [${actualParticipants.join(', ')}]`);
  }

  // 4. Check for unexpected or unauthorized extra participants (must be strictly 2 participants)
  const unexpectedUids = actualParticipants.filter((uid) => uid !== cleanSender && uid !== cleanTarget);
  if (unexpectedUids.length > 0) {
    mismatches.push(`Participants array contains unexpected extraneous UIDs: [${unexpectedUids.join(', ')}]. Expected strictly 2 participants.`);
  }

  // 5. Check for duplicate UIDs in participants array
  const uniqueParticipants = Array.from(new Set(actualParticipants));
  if (uniqueParticipants.length !== actualParticipants.length) {
    mismatches.push(`Participants array contains duplicate entries: [${actualParticipants.join(', ')}]`);
  }

  // 6. Check senderId and receiverId consistency if present
  if (actualSenderId && actualSenderId !== cleanSender && actualSenderId !== cleanTarget) {
    mismatches.push(`Document senderId "${actualSenderId}" matches neither sender (${cleanSender}) nor receiver (${cleanTarget})`);
  }
  if (actualReceiverId && actualReceiverId !== cleanSender && actualReceiverId !== cleanTarget) {
    mismatches.push(`Document receiverId "${actualReceiverId}" matches neither sender (${cleanSender}) nor receiver (${cleanTarget})`);
  }

  // 7. Check conversationId
  if (actualConversationId && actualConversationId !== expectedConversationId) {
    mismatches.push(`Document conversationId "${actualConversationId}" does not match sorted pair "${expectedConversationId}"`);
  }

  const isValid = mismatches.length === 0;

  return {
    isValid,
    docId: docData.id,
    senderUid: cleanSender,
    targetUid: cleanTarget,
    expectedParticipants,
    actualParticipants,
    mismatches,
    conversationId: actualConversationId,
    expectedConversationId
  };
}

/**
 * Diagnostic runner that logs mismatches or success to console when a user opens a DM session.
 */
export function diagnoseDMSession(
  senderUid: string,
  targetUid: string,
  documents: Array<{ id: string; [key: string]: any }> = [],
  sessionContext: string = 'DM Session'
): { totalChecked: number; validCount: number; invalidCount: number; results: ParticipantVerificationResult[] } {
  const cleanSender = String(senderUid || '').trim();
  const cleanTarget = String(targetUid || '').trim();
  const expectedConvId = [cleanSender, cleanTarget].sort().join('_');

  // Baseline session verification check
  const sessionCheck = verifyDMParticipants(cleanSender, cleanTarget, {
    id: `session-${expectedConvId}`,
    participants: [cleanSender, cleanTarget],
    senderId: cleanSender,
    receiverId: cleanTarget,
    conversationId: expectedConvId
  });

  if (!sessionCheck.isValid) {
    console.warn(`[DM Diagnostic Mismatch] Session setup parameter mismatch between sender (${cleanSender}) and target (${cleanTarget}):`, sessionCheck.mismatches);
  }

  const results: ParticipantVerificationResult[] = [];
  let invalidCount = 0;

  if (documents.length === 0) {
    console.info(`[DM Diagnostic Info] Opened ${sessionContext} between sender "${cleanSender}" and target "${cleanTarget}". Conversation ID: "${expectedConvId}". (No past message documents in Firestore yet)`);
    return {
      totalChecked: 0,
      validCount: 0,
      invalidCount: 0,
      results: [sessionCheck]
    };
  }

  for (const doc of documents) {
    const result = verifyDMParticipants(cleanSender, cleanTarget, doc);
    results.push(result);
    if (!result.isValid) {
      invalidCount++;
      console.warn(
        `[DM Diagnostic Mismatch] Discrepancy in Firestore message doc "${doc.id || 'unknown'}" for ${sessionContext}:`,
        {
          docId: doc.id,
          senderUid: cleanSender,
          targetUid: cleanTarget,
          actualParticipants: result.actualParticipants,
          expectedParticipants: result.expectedParticipants,
          mismatches: result.mismatches,
          rawDoc: doc
        }
      );
    }
  }

  const validCount = documents.length - invalidCount;

  if (invalidCount === 0) {
    console.info(
      `[DM Diagnostic Match] All ${documents.length} message document(s) in session "${expectedConvId}" match Firestore 'participants' array [${sessionCheck.expectedParticipants.join(', ')}] exactly.`
    );
  } else {
    console.warn(
      `[DM Diagnostic Warning] Found ${invalidCount} of ${documents.length} document(s) with participant mismatches in session "${expectedConvId}".`
    );
  }

  return {
    totalChecked: documents.length,
    validCount,
    invalidCount,
    results
  };
}
