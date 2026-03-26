import { Button } from "@polarnl/polarui-react"
import { useNavigate } from "react-router";
import { useRouteLoaderData } from "react-router";
import i18n from "~/i18n";

export default function Home() {
  const rootData = useRouteLoaderData("root") as any;
  const lang = rootData?.lang || "nl";
  const t = i18n.t;
  const navigate = useNavigate()
  return (
    <>
      <h1>{t("welcome")}</h1>
      <p>{t("description")}</p>
      <br />
      <Button textColor="black" onClick={() => navigate("/auth/sign-in")}>
        {t("auth:login")}
      </Button>
    </>
  );
}
