# Domain Configuration for PDF Clinic

## Production Domain
- **Primary Domain**: www.pdfclinic.org
- **Protocol**: HTTPS (SSL required)
- **CDN**: Recommended for global performance

## DNS Configuration Required

### A Records
```
@ -> [Your server IP]
www -> [Your server IP]
```

### CNAME Records (if using CDN)
```
www -> your-cdn-domain.com
```

### Additional Records
```
TXT "google-site-verification=[verification-code]"  # For Google Search Console
```

## SSL Certificate
- Ensure SSL certificate covers both:
  - pdfclinic.org
  - www.pdfclinic.org

## Redirect Configuration
- Redirect http:// to https://
- Redirect non-www to www (SEO best practice)
- Example: pdfclinic.org -> www.pdfclinic.org

## Deployment Notes
- Update all environment variables to use www.pdfclinic.org
- Configure CORS to allow www.pdfclinic.org
- Update any API base URLs to match the domain
- Test all social media sharing after deployment

## Verification Checklist
- [ ] DNS propagation complete
- [ ] SSL certificate valid
- [ ] Redirects working correctly
- [ ] Google Search Console verified
- [ ] Open Graph preview working
- [ ] Twitter Card preview working
- [ ] Sitemap accessible at www.pdfclinic.org/sitemap.xml
- [ ] Robots.txt accessible at www.pdfclinic.org/robots.txt
