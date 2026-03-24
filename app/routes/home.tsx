import { Button } from "@polarnl/polarui-react"
import { useNavigate } from "react-router";

export default function Home() {
  const navigate = useNavigate()
  return (
    <>
      <h1>Marketing here.. (t.b.d by andrei)</h1>
      <br />
      <Button textColor="black" onClick={() => navigate("/auth/sign-in")}>
        Go to login
      </Button>
    </>
  );
}
