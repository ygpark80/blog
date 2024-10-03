import {$log} from "@tsed/common";
import { PlatformExpress } from "@tsed/platform-express";

async function bootstrap() {
  try {
    const { Server } = await import("./Server")
		const platform = await PlatformExpress.bootstrap(Server, {
			httpPort: process.env.PORT || 8083,
			httpsPort: false // CHANGE
		})
		await platform.listen()

    process.on("SIGINT", () => {
      platform.stop();
    });
  } catch (error) {
    $log.error({event: "SERVER_BOOTSTRAP_ERROR", message: error.message, stack: error.stack});
  }
}

bootstrap();
