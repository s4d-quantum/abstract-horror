<?php

function quantumEventOutboxBuildIdempotencyKey($eventType, $entityType, $entityId, $payloadJson, array $idempotencyParts = array())
{
    $keyParts = array(
        (string)$eventType,
        (string)$entityType,
        $entityId === null ? '' : (string)$entityId,
        (string)$payloadJson,
    );

    if (!empty($idempotencyParts)) {
        foreach ($idempotencyParts as $part) {
            if (is_scalar($part) || $part === null) {
                $keyParts[] = $part === null ? '' : (string)$part;
            } else {
                $encodedPart = json_encode($part, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
                $keyParts[] = $encodedPart === false ? '' : $encodedPart;
            }
        }
    }

    return hash('sha256', implode('|', $keyParts));
}

function recordQuantumEvent($db, $eventType, $entityType, $entityId, array $payload, $sourceFile = null, $sourceUser = null, array $idempotencyParts = array())
{
    if (!($db instanceof mysqli)) {
        error_log('Quantum event outbox: invalid database handle for event ' . (string)$eventType);
        return false;
    }

    $payloadJson = json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    if ($payloadJson === false) {
        error_log(
            'Quantum event outbox: failed to encode payload for event ' . (string)$eventType .
            ' entity ' . (string)$entityType . ':' . ($entityId === null ? '' : (string)$entityId) .
            ' source ' . ($sourceFile === null ? '' : (string)$sourceFile)
        );
        return false;
    }

    $idempotencyKey = quantumEventOutboxBuildIdempotencyKey(
        $eventType,
        $entityType,
        $entityId,
        $payloadJson,
        $idempotencyParts
    );

    $sql = "INSERT IGNORE INTO quantum_event_outbox (
        event_type,
        entity_type,
        entity_id,
        payload_json,
        source_user,
        source_file,
        idempotency_key
    ) VALUES (?, ?, ?, ?, ?, ?, ?)";

    $stmt = mysqli_prepare($db, $sql);
    if (!$stmt) {
        error_log(
            'Quantum event outbox: prepare failed for event ' . (string)$eventType .
            ' entity ' . (string)$entityType . ':' . ($entityId === null ? '' : (string)$entityId) .
            ' source ' . ($sourceFile === null ? '' : (string)$sourceFile) .
            ' error ' . mysqli_error($db)
        );
        return false;
    }

    $entityIdValue = $entityId === null ? null : (string)$entityId;
    $sourceUserValue = $sourceUser === null ? null : (string)$sourceUser;
    $sourceFileValue = $sourceFile === null ? null : (string)$sourceFile;

    mysqli_stmt_bind_param(
        $stmt,
        'sssssss',
        $eventType,
        $entityType,
        $entityIdValue,
        $payloadJson,
        $sourceUserValue,
        $sourceFileValue,
        $idempotencyKey
    );

    if (!mysqli_stmt_execute($stmt)) {
        error_log(
            'Quantum event outbox: execute failed for event ' . (string)$eventType .
            ' entity ' . (string)$entityType . ':' . ($entityId === null ? '' : (string)$entityId) .
            ' source ' . ($sourceFile === null ? '' : (string)$sourceFile) .
            ' error ' . mysqli_stmt_error($stmt)
        );
        mysqli_stmt_close($stmt);
        return false;
    }

    if (mysqli_stmt_affected_rows($stmt) > 0) {
        $insertedId = mysqli_insert_id($db);
        mysqli_stmt_close($stmt);
        return (int)$insertedId;
    }

    mysqli_stmt_close($stmt);
    return 0;
}
