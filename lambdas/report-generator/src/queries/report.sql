WITH vars AS (
    SELECT
        CAST(? AS DATE) AS dt,
        ? AS senderid
)
SELECT
    e.messagereference,
    e.pagecount,
    e.supplierid,
    e.time,
    e.type,
    e.senderid
FROM event_record e
CROSS JOIN vars v
WHERE e.senderid = v.senderid
  AND e.__year = year(v.dt)
  AND e.__month = month(v.dt)
  AND e.__day = day(v.dt);
