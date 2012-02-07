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
        <xsl:apply-templates select="atom:entry"/>
    </xsl:template>
    <xsl:template match="atom:entry">
        <h2><xsl:value-of select="atom:title"/></h2>
        <xsl:copy-of select="atom:content"/>
    </xsl:template>
</xsl:stylesheet>
