<?php

namespace App\Providers;

use App\Services\Pagos\PasarelaPagos;
use App\Services\Pagos\PasarelaStripe;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // CU-09: la pasarela de pagos es Stripe (modo de prueba); las pruebas la reemplazan.
        $this->app->singleton(PasarelaPagos::class, fn () => new PasarelaStripe(
            config('services.stripe.secret'),
            config('services.stripe.webhook_secret'),
        ));
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // La base db_grupo14sa es compartida con el sistema vía correo: se bloquean
        // migrate:fresh, migrate:refresh, migrate:reset y db:wipe, que borrarían
        // también sus 26 tablas.
        DB::prohibitDestructiveCommands();
    }
}
