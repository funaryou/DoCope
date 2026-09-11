package server.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class IconConfig implements WebMvcConfigurer {
    @Override
    public void addResourceHandlers(
        ResourceHandlerRegistry registry
    ) {
        registry
            .addResourceHandler("/icons/**")
            .addResourceLocations("file:data/icons/");
    }
}
