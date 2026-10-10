-- Bildirim hiçbir cihaza ulaşamadığında ilk başarısızlık zamanı; başarıda temizlenir.
ALTER TABLE todos ADD COLUMN notify_failing_since INTEGER;
