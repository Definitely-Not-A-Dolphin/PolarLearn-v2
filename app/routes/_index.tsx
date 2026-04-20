import { Button } from "@polarnl/polarui-react"
import { useNavigate } from "react-router";
import i18n from "~/i18n";

export default function Home() {
  const t = i18n.t;
  const navigate = useNavigate()
  return (
    <>
      <h1>{t("home.title")}</h1>
      <p>{t("home.description")}</p>
      <br />
      <Button textColor="black" onClick={() => navigate("/auth/sign-in")}>
        {t("auth:actions.login")}
      </Button>
    </>
  );
}
