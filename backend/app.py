"""
Campus Rideshare - Flask Application Factory
Creates and configures the Flask app, registers extensions and blueprints.
"""

from flask import Flask
from flask_cors import CORS
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager

from backend.config import config as app_config

# Extensions (initialised in create_app)
bcrypt = Bcrypt()
jwt    = JWTManager()


def create_app():
    """Application factory."""
    app = Flask(
        __name__,
        static_folder=app_config.STATIC_FOLDER,
        static_url_path='/static',
    )

    # Load configuration
    app.config.from_object(app_config)

    # Initialise extensions
    # Allow credentialed CORS for API routes and use configured origins.
    # Note: when using credentials, the Access-Control-Allow-Origin header
    # must be a specific origin (not '*'). Configure CORS_ORIGINS in .env
    # to the frontend origin (e.g. http://localhost:5500) if needed.
    CORS(app, supports_credentials=True, resources={r"/api/*": {"origins": app_config.CORS_ORIGINS}})
    bcrypt.init_app(app)
    jwt.init_app(app)

    # ── Initialise the database connection pool ──────────────────
    from backend.database.database import init_db, close_db
    init_db(app)
    app.teardown_appcontext(close_db)

    # ── Register blueprints ──────────────────────────────────────
    from backend.routes.auth_routes  import auth_bp
    from backend.routes.ride_routes  import ride_bp
    from backend.routes.user_routes  import user_bp
    from backend.routes.admin_routes import admin_bp
    from backend.routes.ai_routes    import ai_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(ride_bp)
    app.register_blueprint(user_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(ai_bp)

    # ── Serve frontend HTML pages ────────────────────────────────
    from flask import send_from_directory

    @app.route('/')
    def serve_index():
        return send_from_directory(app_config.STATIC_FOLDER, 'index.html')

    @app.route('/<path:filename>')
    def serve_frontend(filename):
        """Serve frontend files (HTML, CSS, JS, assets)."""
        import os
        file_path = os.path.join(app_config.STATIC_FOLDER, filename)
        if os.path.isfile(file_path):
            return send_from_directory(app_config.STATIC_FOLDER, filename)
        # Fallback to index.html for SPA-like behavior
        return send_from_directory(app_config.STATIC_FOLDER, 'index.html')

    # ── Global JSON error handler ──────────────────────────────────
    from werkzeug.exceptions import HTTPException

    @app.errorhandler(Exception)
    def handle_exception(e):
        if isinstance(e, HTTPException):
            return e
        app.logger.exception('Unhandled exception')
        from backend.utils.response import error_response
        return error_response('An internal error occurred', 500)

    # ── Health-check endpoint ────────────────────────────────────
    @app.route('/api/health/')
    def health():
        from flask import jsonify
        from backend.database.database import health_check
        db_status = health_check()
        return jsonify({
            'status': 'ok',
            'app': 'Campus Rideshare',
            'version': '1.0.0',
            'description': 'Campus Rideshare connects drivers and riders for shared university commutes',
            'message': 'Server is up and running!',
            'database': db_status,
        })

    return app
