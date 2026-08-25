import { getTranslations } from "next-intl/server";
import {
  Camera,
  ExternalLink,
  MapPin,
  Phone,
  UtensilsCrossed,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RestaurantProfile } from "@/lib/data/restaurants";

// WhatsApp is how Cyprus books tables by phone — always offer it when set.
export async function ContactButtons({
  restaurant,
}: {
  restaurant: Pick<
    RestaurantProfile,
    "phone" | "whatsapp" | "website" | "instagram" | "menu_url" | "lat" | "lng"
  >;
}) {
  const t = await getTranslations();
  const wa = restaurant.whatsapp?.replace(/\D/g, "");

  return (
    <div className="flex flex-wrap gap-2">
      {restaurant.phone ? (
        <Button asChild variant="outline" size="sm">
          <a href={`tel:${restaurant.phone}`}>
            <Phone data-icon="inline-start" />
            {t("restaurant.call")}
          </a>
        </Button>
      ) : null}
      {wa ? (
        <Button asChild variant="outline" size="sm">
          <a
            href={`https://wa.me/${wa}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("restaurant.whatsapp")}
          </a>
        </Button>
      ) : null}
      {restaurant.menu_url ? (
        <Button asChild variant="outline" size="sm">
          <a
            href={restaurant.menu_url}
            target="_blank"
            rel="noopener noreferrer"
          >
            <UtensilsCrossed data-icon="inline-start" />
            {t("restaurant.viewMenu")}
          </a>
        </Button>
      ) : null}
      {restaurant.website ? (
        <Button asChild variant="outline" size="sm">
          <a
            href={restaurant.website}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink data-icon="inline-start" />
            {t("restaurant.website")}
          </a>
        </Button>
      ) : null}
      {restaurant.instagram ? (
        <Button asChild variant="outline" size="sm">
          <a
            href={restaurant.instagram}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Camera data-icon="inline-start" />
            Instagram
          </a>
        </Button>
      ) : null}
      <Button asChild variant="outline" size="sm">
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${restaurant.lat},${restaurant.lng}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <MapPin data-icon="inline-start" />
          {t("restaurant.getDirections")}
        </a>
      </Button>
    </div>
  );
}
