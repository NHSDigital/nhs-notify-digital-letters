WITH vars AS (
    SELECT CAST(? AS DATE) AS dt,
        ? AS senderid
),
"translated_events" AS (
    SELECT e.messagereference,
        e.time,
        CASE
            WHEN e.type LIKE '%.item.dequeued.%'
            OR e.type LIKE '%.item.removed.%' THEN 'Digital'
            WHEN e.type LIKE '%.print.letter.transitioned.%' THEN 'Print' ELSE NULL
        END as communicationtype,
        CASE
            WHEN e.type LIKE '%.item.dequeued.%' THEN 'Unread'
            WHEN e.type LIKE '%.item.removed.%' THEN 'Read'
            WHEN e.letterstatus = 'RETURNED' THEN 'Returned'
            WHEN e.letterstatus = 'FAILED' THEN 'Failed'
            WHEN e.letterstatus = 'DISPATCHED' THEN 'Dispatched'
            WHEN e.letterstatus = 'REJECTED' THEN 'Rejected' ELSE NULL
        END as status
    FROM event_record e
        CROSS JOIN vars v
    WHERE e.senderid = v.senderid
        AND e.__year = year(v.dt)
        AND e.__month = month(v.dt)
        AND e.__day = day(v.dt)
),
"ordered_events" AS (
    SELECT ROW_NUMBER() OVER (
            PARTITION BY te.messagereference, te.communicationtype
            ORDER BY te.time DESC,
                CASE
                    -- Digital Priority Order
                    WHEN te.status = 'Read' THEN 2
                    WHEN te.status = 'Unread' THEN 1
                    -- Print Priority Order
                    WHEN te.status = 'Returned' THEN 4
                    WHEN te.status = 'Failed' THEN 3
                    WHEN te.status = 'Dispatched' THEN 2
                    WHEN te.status = 'Rejected' THEN 1 ELSE 0
                END DESC
        ) AS "row_number",
        te.messagereference,
        te.time,
        te.communicationtype,
        te.status
    FROM "translated_events" AS te
    where te.status IS NOT NULL
)
SELECT oe.messagereference,
    oe.time,
    oe.communicationtype,
    oe.status
FROM "ordered_events" AS oe
WHERE oe.row_number = 1
