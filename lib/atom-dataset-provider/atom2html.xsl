<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet version="1.0"
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:output method="html"/>
    <xsl:template match="/">
        <xsl:apply-templates select="/atom:feed"/>
    </xsl:template>
    <xsl:template match="/atom:feed">
        <h1><xsl:value-of select="atom:title"/></h1>
        <ul>
        <xsl:apply-templates select="atom:link"/>
        </ul>
        <xsl:apply-templates select="atom:entry"/>
    </xsl:template>
    <xsl:template match="atom:entry">
        <h2><xsl:value-of select="atom:title"/></h2>
        <xsl:copy-of select="atom:content"/>
    </xsl:template>
    <xsl:template match="atom:link">
        <li><a href="{./@href}"><xsl:value-of select="@rel"/></a></li>
    </xsl:template>
</xsl:stylesheet>
