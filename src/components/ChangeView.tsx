import { useMap } from "react-leaflet";
import { useEffect } from "react";

export function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();

  useEffect(() => {
    map.setView(center);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center]);

  return null;
}
