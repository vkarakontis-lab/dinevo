import { getTranslations } from "next-intl/server";
import {
  Camera,
  ExternalLink,
  MapPin,
  MessageCircle,
  Phone,
  UtensilsCrossed,
} from "lucide-react";
import type { RestaurantProfile } from "@/lib/data/restaurants";
import { cn } from "@/lib/utils";

const PILL =
  "inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition-colors";

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
        <a
          href={`tel:${restaurant.phone}`}
          className={cn(
            PILL,
            "border-coral/30 bg-coral-soft text-coral hover:bg-coral/15",
          )}
        >
          <Phone className="size-4" aria-hidden />
          {t("restaurant.call")}
        </a>
      ) : null}

      {wa ? (
        <a
          href={`https://wa.me/${wa}`}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            PILL,
            "border-mint/30 bg-mint-soft text-mint hover:bg-mint/15",
          )}
        >
          <MessageCircle className="size-4" aria-hidden />
          {t("restaurant.whatsapp")}
        </a>
      ) : null}

      <a
        href={`https://www.google.com/maps/dir/?api=1&destination=${restaurant.lat},${restaurant.lng}`}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          PILL,
          "border-sea/30 bg-sea-soft text-sea hover:bg-sea/15",
        )}
      >
        <MapPin className="size-4" aria-hidden />
        {t("restaurant.getDirections")}
      </a>

      {restaurant.menu_url ? (
        <a
          href={restaurant.menu_url}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(PILL, "border-border bg-card hover:bg-muted")}
        >
          <UtensilsCrossed className="size-4" aria-hidden />
          {t("restaurant.viewMenu")}
        </a>
      ) : null}

      {restaurant.website ? (
        <a
          href={restaurant.website}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(PILL, "border-border bg-card hover:bg-muted")}
        >
          <ExternalLink className="size-4" aria-hidden />
          {t("restaurant.website")}
        </a>
      ) : null}

      {restaurant.instagram ? (
        <a
          href={restaurant.instagram}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(PILL, "border-border bg-card hover:bg-muted")}
        >
          <Camera className="size-4" aria-hidden />
          Instagram
        </a>
      ) : null}
    </div>
  );
}
